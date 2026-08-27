require("dotenv").config();

const Database = require("better-sqlite3");
const pool = require("../config/db");

const sqlite = new Database("./tickets.db", {
  readonly: true
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting SQLite → PostgreSQL migration...\n");

    // Read SQLite data
    const events = sqlite
      .prepare("SELECT * FROM events ORDER BY id")
      .all();

    const tickets = sqlite
      .prepare("SELECT * FROM tickets ORDER BY id")
      .all();

    const mpesaTransactions = sqlite
      .prepare("SELECT * FROM mpesa_transactions ORDER BY id")
      .all();

    console.log(`📦 SQLite data found:`);
    console.log(`   Events: ${events.length}`);
    console.log(`   Tickets: ${tickets.length}`);
    console.log(`   M-Pesa transactions: ${mpesaTransactions.length}\n`);

    await client.query("BEGIN");

    // ============================================================
    // EVENTS
    // ============================================================

    console.log("📅 Migrating events...");

    for (const event of events) {
      await client.query(
        `
        INSERT INTO events (
          id,
          title,
          description,
          date,
          time,
          venue,
          price,
          capacity,
          image,
          status,
          created_at,
          total_tickets,
          available_tickets,
          single_price,
          couple_price,
          group3_price,
          early_bird_enabled,
          early_bird_single_price,
          early_bird_expiry
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19
        )
        ON CONFLICT (id) DO NOTHING
        `,
        [
          event.id,
          event.title,
          event.description,
          event.date,
          event.time,
          event.venue,
          event.price,
          event.capacity,
          event.image,
          event.status,
          event.created_at,
          event.total_tickets,
          event.available_tickets,
          event.single_price,
          event.couple_price,
          event.group3_price,
          event.early_bird_enabled,
          event.early_bird_single_price,
          event.early_bird_expiry
        ]
      );
    }

    console.log(`   ✅ ${events.length} events migrated`);

    // ============================================================
    // TICKETS
    // ============================================================

    console.log("🎟️ Migrating tickets...");

    for (const ticket of tickets) {
      await client.query(
        `
        INSERT INTO tickets (
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          deleted_at,
          created_at,
          idempotency_key,
          qr_token_hash,
          verification_code_hash,
          verification_code_expires_at,
          verification_code_sent_at,
          verification_attempts,
          verified_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (id) DO NOTHING
        `,
        [
          ticket.id,
          ticket.ticket_id,
          ticket.event_id,
          ticket.event_title,
          ticket.ticket_type,
          ticket.price,
          ticket.quantity,
          ticket.customer_name,
          ticket.customer_email,
          ticket.customer_phone,
          ticket.payment_status,
          ticket.ticket_status,
          ticket.deleted_at,
          ticket.created_at,
          ticket.idempotency_key,
          ticket.qr_token_hash,
          ticket.verification_code_hash,
          ticket.verification_code_expires_at,
          ticket.verification_code_sent_at,
          ticket.verification_attempts,
          ticket.verified_at
        ]
      );
    }

    console.log(`   ✅ ${tickets.length} tickets migrated`);

    // ============================================================
    // M-PESA TRANSACTIONS
    // ============================================================

    console.log("💰 Migrating M-Pesa transactions...");

    for (const transaction of mpesaTransactions) {
      await client.query(
        `
        INSERT INTO mpesa_transactions (
          id,
          checkout_request_id,
          merchant_request_id,
          phone_number,
          amount,
          account_reference,
          status,
          transaction_id,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        ON CONFLICT (id) DO NOTHING
        `,
        [
          transaction.id,
          transaction.checkout_request_id,
          transaction.merchant_request_id,
          transaction.phone_number,
          transaction.amount,
          transaction.account_reference,
          transaction.status,
          transaction.transaction_id,
          transaction.created_at,
          transaction.updated_at
        ]
      );
    }

    console.log(
      `   ✅ ${mpesaTransactions.length} M-Pesa transactions migrated`
    );

    // ============================================================
    // RESET SEQUENCES
    // ============================================================

    console.log("\n🔄 Resetting PostgreSQL sequences...");

    await client.query(`
      SELECT setval(
        'events_id_seq',
        COALESCE((SELECT MAX(id) FROM events), 1),
        true
      )
    `);

    await client.query(`
      SELECT setval(
        'tickets_id_seq',
        COALESCE((SELECT MAX(id) FROM tickets), 1),
        true
      )
    `);

    await client.query(`
      SELECT setval(
        'mpesa_transactions_id_seq',
        COALESCE((SELECT MAX(id) FROM mpesa_transactions), 1),
        true
      )
    `);

    await client.query("COMMIT");

    console.log("   ✅ Sequences reset");

    // ============================================================
    // VERIFY
    // ============================================================

    console.log("\n🔍 Verifying migration...");

    const eventCount = await client.query(
      "SELECT COUNT(*)::int AS count FROM events"
    );

    const ticketCount = await client.query(
      "SELECT COUNT(*)::int AS count FROM tickets"
    );

    const mpesaCount = await client.query(
      "SELECT COUNT(*)::int AS count FROM mpesa_transactions"
    );

    console.log(
      `   PostgreSQL events: ${eventCount.rows[0].count}`
    );

    console.log(
      `   PostgreSQL tickets: ${ticketCount.rows[0].count}`
    );

    console.log(
      `   PostgreSQL M-Pesa transactions: ${mpesaCount.rows[0].count}`
    );

    console.log("\n🎉 Migration completed successfully!");

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("\n❌ Migration failed!");
    console.error(error);

    process.exitCode = 1;

  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

migrate();