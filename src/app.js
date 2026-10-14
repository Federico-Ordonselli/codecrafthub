// app.js

// Import required Node.js and Express modules
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

// Create the Express application
const app = express();

// The server must run on port 5000
const PORT = 5000;

// Store courses.json in the same directory as this app.js file
const DATA_FILE = path.join(__dirname, "courses.json");

// Allowed values for a course status
const ALLOWED_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed"
];

// Enable Express to read JSON request bodies
app.use(express.json());

// Serve the dashboard from the same origin as the API.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

/*
  Create courses.json automatically if it does not exist.

  The file starts with an empty array because courses will be
  stored as an array of objects.
*/
async function ensureDataFileExists() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    // If the file does not exist, create it
    if (error.code === "ENOENT") {
      await fs.writeFile(DATA_FILE, "[]", "utf8");
      console.log("Created courses.json");
    } else {
      throw error;
    }
  }
}

/*
  Read all courses from courses.json.

  The JSON file should contain an array such as:
  [
    {
      "id": 1,
      "name": "Node.js Fundamentals",
      "description": "Learn Node.js basics.",
      "target_date": "2026-12-31",
      "status": "Not Started",
      "created_at": "2026-10-14T12:00:00.000Z"
    }
  ]
*/
async function readCourses() {
  try {
    await ensureDataFileExists();

    const fileContents = await fs.readFile(DATA_FILE, "utf8");

    // If the file is empty, treat it as an empty course list
    if (!fileContents.trim()) {
      return [];
    }

    const courses = JSON.parse(fileContents);

    // Make sure the file contains an array
    if (!Array.isArray(courses)) {
      const error = new Error("courses.json must contain an array.");
      error.code = "INVALID_DATA_FILE";
      throw error;
    }

    return courses;
  } catch (error) {
    // JSON parsing errors are data-file errors
    if (error instanceof SyntaxError) {
      error.code = "INVALID_DATA_FILE";
    }

    throw error;
  }
}

/*
  Save all courses to courses.json.

  JSON.stringify converts the JavaScript array into formatted JSON.
*/
async function writeCourses(courses) {
  try {
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(courses, null, 2),
      "utf8"
    );
  } catch (error) {
    throw error;
  }
}

/*
  Validate a date in YYYY-MM-DD format.

  This checks both the format and whether the date is real.
  For example, 2026-02-30 is rejected.
*/
function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/*
  Validate the fields required to create or update a course.

  Returns an error message if validation fails.
  Returns null when all fields are valid.
*/
function validateCourse(course) {
  if (!course || typeof course !== "object") {
    return "Request body must contain course data.";
  }

  if (
    !course.name ||
    typeof course.name !== "string" ||
    course.name.trim() === ""
  ) {
    return "The name field is required.";
  }

  if (
    !course.description ||
    typeof course.description !== "string" ||
    course.description.trim() === ""
  ) {
    return "The description field is required.";
  }

  if (!course.target_date) {
    return "The target_date field is required.";
  }

  if (!isValidDate(course.target_date)) {
    return "target_date must be a valid date in YYYY-MM-DD format.";
  }

  if (!course.status) {
    return "The status field is required.";
  }

  if (!ALLOWED_STATUSES.includes(course.status)) {
    return `Invalid status. Status must be one of: ${ALLOWED_STATUSES.join(
      ", "
    )}.`;
  }

  return null;
}

/*
  Generate the next course ID.

  IDs start at 1. For example:
  - Empty list -> ID 1
  - Existing IDs 1, 2, 3 -> ID 4
*/
function getNextCourseId(courses) {
  if (courses.length === 0) {
    return 1;
  }

  const highestId = Math.max(
    ...courses.map((course) => Number(course.id) || 0)
  );

  return highestId + 1;
}

/*
  POST /api/courses

  Add a new course.
*/
app.post("/api/courses", async (req, res, next) => {
  try {
    const validationError = validateCourse(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const courses = await readCourses();

    const newCourse = {
      id: getNextCourseId(courses),
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: new Date().toISOString()
    };

    courses.push(newCourse);
    await writeCourses(courses);

    return res.status(201).json(newCourse);
  } catch (error) {
    next(error);
  }
});

/*
  GET /api/courses

  Get all courses.
*/
app.get("/api/courses", async (req, res, next) => {
  try {
    const courses = await readCourses();

    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
});

// Register this before /:id so "stats" is not treated as a course ID.
app.get("/api/courses/stats", async (req, res, next) => {
  try {
    const courses = await readCourses();
    const byStatus = {};

    // Include every allowed status, even when its count is zero.
    for (const status of ALLOWED_STATUSES) {
      byStatus[status] = courses.filter(course => course.status === status).length;
    }

    return res.status(200).json({ total: courses.length, byStatus });
  } catch (error) {
    next(error);
  }
});

/*
  GET /api/courses/:id

  Get one specific course by its ID.

  Example:
  GET /api/courses/1
*/
app.get("/api/courses/:id", async (req, res, next) => {
  try {
    const courses = await readCourses();
    const courseId = Number(req.params.id);

    const course = courses.find((item) => item.id === courseId);

    if (!course) {
      return res.status(404).json({
        error: "Course not found."
      });
    }

    return res.status(200).json(course);
  } catch (error) {
    next(error);
  }
});

/*
  PUT /api/courses/:id

  Update an existing course.

  PUT expects all required course fields in the request body.
*/
app.put("/api/courses/:id", async (req, res, next) => {
  try {
    const validationError = validateCourse(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const courses = await readCourses();
    const courseId = Number(req.params.id);

    const courseIndex = courses.findIndex(
      (course) => course.id === courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        error: "Course not found."
      });
    }

    // Keep the original ID and created_at timestamp
    const updatedCourse = {
      id: courses[courseIndex].id,
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: courses[courseIndex].created_at
    };

    courses[courseIndex] = updatedCourse;

    await writeCourses(courses);

    return res.status(200).json(updatedCourse);
  } catch (error) {
    next(error);
  }
});

/*
  DELETE /api/courses/:id

  Delete a course by its ID.
*/
app.delete("/api/courses/:id", async (req, res, next) => {
  try {
    const courses = await readCourses();
    const courseId = Number(req.params.id);

    const courseIndex = courses.findIndex(
      (course) => course.id === courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        error: "Course not found."
      });
    }

    const deletedCourse = courses.splice(courseIndex, 1)[0];

    await writeCourses(courses);

    return res.status(200).json({
      message: "Course deleted successfully.",
      course: deletedCourse
    });
  } catch (error) {
    next(error);
  }
});

/*
  Handle invalid JSON sent in a request body.

  For example, this is invalid:
  { "name": "Node.js"
*/
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Request body contains invalid JSON."
    });
  }

  next(error);
});

/*
  Global error handler.

  This catches file read errors, file write errors, invalid JSON files,
  and any unexpected errors.
*/
app.use((error, req, res, next) => {
  console.error("Error:", error);

  if (error.code === "ENOENT") {
    return res.status(500).json({
      error: "The courses.json file could not be found."
    });
  }

  if (
    error.code === "EACCES" ||
    error.code === "EPERM" ||
    error.code === "EROFS"
  ) {
    return res.status(500).json({
      error: "The courses.json file could not be read or written."
    });
  }

  if (error.code === "INVALID_DATA_FILE") {
    return res.status(500).json({
      error: "The courses.json file contains invalid data."
    });
  }

  return res.status(500).json({
    error: "An unexpected server error occurred."
  });
});

/*
  Start the server.

  courses.json is created before the server starts if it does not
  already exist.
*/
async function startServer() {
  try {
    await ensureDataFileExists();

    app.listen(PORT, () => {
      console.log(`CodeCraftHub API is running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error);
    process.exit(1);
  }
}

startServer();
