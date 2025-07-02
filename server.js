// server.js
const express = require("express");
const cors = require("cors");
const { connectDB, sql } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UP and Running");
});

app.get("/api/dbtest", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT GETDATE() AS now");
    res.json({ success: true, now: result.recordset[0].now });
  } catch (err) {
    console.error("❌ DB Test Error:", err);
    res
      .status(500)
      .json({ success: false, message: "DB test failed", error: err.message });
  }
});

// ---- Force DB connection on startup ----
connectDB()
  .then(() => {
    console.log("📦 MSSQL pool ready");
  })
  .catch((err) => {
    console.error("❌ Failed to initialize DB connection at startup", err);
  });

// GET /api/elibrary
app.get("/api/elibrary", async (req, res) => {
  const { page = 1, limit = 10, department = "", search = "" } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const pool = await connectDB();
    const request = pool.request();

    request.input("department", sql.VarChar, `%${department}%`);
    request.input("search", sql.VarChar, `%${search}%`);
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, parseInt(limit));

    const result = await request.query(`
      SELECT [filenames], [folder], [id], [extn], [date1], LEFT([txt], 3000) AS preview
      FROM [dbo].[files]
      WHERE ([deleted] IS NULL OR [deleted] = 0)
        AND (@department = '' OR folder LIKE @department)
        AND (@search = '' OR filenames LIKE @search OR txt LIKE @search)
      ORDER BY [date1] DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(*) AS total
      FROM [dbo].[files]
      WHERE ([deleted] IS NULL OR [deleted] = 0)
        AND (@department = '' OR folder LIKE @department)
        AND (@search = '' OR filenames LIKE @search OR txt LIKE @search);
    `);

    const records = result.recordsets[0];
    const total = result.recordsets[1][0].total;

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ E-library fetch error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /getdepartments
app.get("/api/getdepartments", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT DISTINCT folder AS department
      FROM [dbo].[files]
      WHERE (deleted IS NULL OR deleted = 0) AND folder IS NOT NULL AND LTRIM(RTRIM(folder)) <> ''
      ORDER BY folder
    `);

    const departments = result.recordset.map((row) => row.department);

    res.json({ success: true, departments });
  } catch (err) {
    console.error("❌ Error fetching departments:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching departments",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`📚 E-library API running at http://localhost:${PORT}`);
});
