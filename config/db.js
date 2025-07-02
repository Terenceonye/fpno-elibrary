const sql = require("mssql");

const dbConfig = {
  user: "netestate",
  password: "asV41b0@6",
  server: "209.159.148.122",
  database: "realestate2",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;

const connectDB = async () => {
  try {
    if (pool) {
      return pool; // reuse existing pool
    }

    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to MSSQL (pooled)");
    return pool;
  } catch (err) {
    console.error("❌ MSSQL connection error:", err);
    throw err;
  }
};

module.exports = {
  sql,
  connectDB,
};
