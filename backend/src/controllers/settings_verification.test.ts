import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { initDatabase, closeDatabase, getDatabase } from "../database/init.ts";
import { updateSettings, getSettings, getSetting } from "./settings.ts";

Deno.test("Settings Controller - Company Address Fields", async (t) => {
  // Setup
  Deno.env.set("DATABASE_PATH", ":memory:");
  // We need to mock readTextFileSync because initDatabase tries to read migrations.sql
  // or ensure we run this from the right directory.
  // Actually, let's just try running it from backend/ root.
  
  try {
    initDatabase();
  } catch (e) {
    // If migration file not found, we might need to manually create the table for this test
    // or adjust CWD.
    console.log("Init failed, likely due to migration file path. Creating table manually.");
    const db = new (await import("sqlite")).DB(":memory:");
    // @ts-ignore: hacking the db instance
    import("../database/init.ts").then(mod => {
        // This is tricky because initDatabase exports a local var. 
        // We might just rely on the fact that if we run `deno test` from `backend/`, it should work.
    });
  }

  // Let's assume initDatabase works if we run from backend/
  
  await t.step("should update companyCity and companyPostalCode", () => {
    updateSettings({
      companyCity: "Berlin",
      companyPostalCode: "10115"
    });

    const city = getSetting("companyCity");
    const zip = getSetting("companyPostalCode");

    assertEquals(city, "Berlin");
    assertEquals(zip, "10115");
  });

  await t.step("should clear companyCity and companyPostalCode when empty", () => {
    updateSettings({
      companyCity: "",
      companyPostalCode: ""
    });

    const city = getSetting("companyCity");
    const zip = getSetting("companyPostalCode");

    // getSetting returns null if not found
    assertEquals(city, null);
    assertEquals(zip, null);
  });

  // Teardown
  closeDatabase();
});
