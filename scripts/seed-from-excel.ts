import dotenv from 'dotenv';
import { createClient } from "@supabase/supabase-js";
import { CLIENTS, ORDERS, COURSES } from '../data/data';

// Run with: npx ts-node scripts/seed-from-excel.ts
// Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OWNER_ID = process.env.CFF_OWNER_ID!; // Set this after first login

async function main() {
  console.log("Starting import from Excel data...");

  // ─── 1. CLIENTS ───────────────────────────────────────────────────
  console.log(`Importing ${CLIENTS.length} clients...`);
  const clientMap: Record<string, string> = {};

  for (const client of CLIENTS) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        owner_id: OWNER_ID,
        name: client.name,
        channel: client.channel,
        order_count: client.order_count,
        total_spent: client.total_spent,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error(`Client error (${client.name}):`, error.message);
    } else if (data) {
      clientMap[client.name] = data.id;
    }
  }
  console.log(`✓ ${Object.keys(clientMap).length} clients imported`);

  // ─── 2. ORDERS ────────────────────────────────────────────────────
  console.log(`Importing ${ORDERS.length} orders...`);
  let orderCount = 0;
  const batchSize = 50;

  for (let i = 0; i < ORDERS.length; i += batchSize) {
    const batch = ORDERS.slice(i, i + batchSize).map((o) => ({
      owner_id: OWNER_ID,
      client_id: clientMap[o.client_name] || null,
      client_name: o.client_name,
      contact_date: o.contact_date || null,
      delivery_date: o.delivery_date,
      product_type: o.product_type,
      description: o.description,
      flavors: o.flavors,
      quoted: o.quoted,
      total: o.total,
      delivery_fee: o.delivery_fee || 0,
      status: o.status,
      payment_status: o.payment_status,
    }));

    const { error } = await supabase.from("orders").insert(batch);
    if (error) {
      console.error(`Orders batch ${i}-${i + batchSize} error:`, error.message);
    } else {
      orderCount += batch.length;
    }
  }
  console.log(`✓ ${orderCount} orders imported`);

  // ─── 3. COURSES ───────────────────────────────────────────────────
  console.log(`Importing ${COURSES.length} course students...`);
  const { error: courseError } = await supabase.from("courses").insert(
    COURSES.map((c) => ({
      owner_id: OWNER_ID,
      course_name: c.course_name,
      course_date: c.course_date || null,
      student_name: c.student_name,
      email: c.email || null,
      phone: c.phone || null,
      location: c.location || "Montreal",
      amount: c.amount,
      status: c.status,
    }))
  );
  if (courseError) console.error("Courses error:", courseError.message);
  else console.log(`✓ ${COURSES.length} course students imported`);

  console.log("\n✅ Import complete!");
  console.log(`   Clients: ${Object.keys(clientMap).length}`);
  console.log(`   Orders:  ${orderCount}`);
  console.log(`   Courses: ${COURSES.length}`);
}

async function seedClients() {
  console.log(`Importing ${CLIENTS.length} clients...`);
  let count = 0;

  for (const client of CLIENTS) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        owner_id: OWNER_ID,
        name: client.name,
        channel: client.channel,
        order_count: client.order_count,
        total_spent: client.total_spent,
      })
      .select("id, name")
      .single();

    if (error) {
      console.error(`Client error (${client.name}):`, error.message);
    } else if (data) {
      console.log(`  ✓ ${data.name}`);
      count++;
    }
  }
  console.log(`\n✅ ${count}/${CLIENTS.length} clients imported`);
}

const cmd = process.argv[2];
if (cmd === "clients") {
  seedClients().catch(console.error);
} else {
  main().catch(console.error);
}


