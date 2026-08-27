const pool =
  require("../config/db");

async function test() {

  try {

    const result =
      await pool.query(`
        SELECT
          NOW() AS current_time,
          current_database() AS database_name,
          current_user AS database_user
      `);

    console.table(
      result.rows
    );

    const tables =
      await pool.query(`
        SELECT
          table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

    console.log(
      "\nPostgreSQL tables:"
    );

    console.table(
      tables.rows
    );

    console.log(
      "\n✅ PostgreSQL connection works."
    );

  } catch (error) {

    console.error(
      "\n❌ PostgreSQL test failed:"
    );

    console.error(
      error
    );

    process.exitCode = 1;

  } finally {

    await pool.end();
  }
}

test();