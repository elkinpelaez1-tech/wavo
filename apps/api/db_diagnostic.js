const { Client } = require('pg');

const connectionString = "postgresql://autopostlab_db_n0ef_user:c72m03VOs0ZiEx3tO7TajYRUITAog8KT@dpg-d7ajjofkijhs73an3in0-a.oregon-postgres.render.com/autopostlab_db_n0ef?sslmode=require";

async function diagnose() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("=== DIAGNÓSTICO DETALLADO DE USUARIOS ===");

  try {
    // 1. Buscar todos los usuarios relacionados
    const usersRes = await client.query(
      `SELECT id, email, "organizationId", name, "createdAt" FROM "User" ORDER BY "createdAt" DESC`
    );

    console.log(`\nTotal de usuarios registrados en la base de datos: ${usersRes.rows.length}`);
    for (const u of usersRes.rows) {
      console.log(`\nUsuario ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Nombre: ${u.name}`);
      console.log(`  Org ID: ${u.organizationId}`);
      console.log(`  Creado: ${u.createdAt}`);

      // Buscar workspaces de este usuario
      const wsRes = await client.query(
        `SELECT id, name, "createdAt" FROM "Workspace" WHERE "ownerId" = $1`,
        [u.id]
      );
      console.log(`  Workspaces de este usuario: ${wsRes.rows.length}`);
      for (const ws of wsRes.rows) {
        const socialRes = await client.query(
          `SELECT COUNT(*) as count FROM "SocialAccount" WHERE "workspaceId" = $1`,
          [ws.id]
        );
        const postsRes = await client.query(
          `SELECT COUNT(*) as count FROM "Post" WHERE "workspaceId" = $1`,
          [ws.id]
        );
        console.log(`    - ID: ${ws.id}`);
        console.log(`      Nombre: "${ws.name}"`);
        console.log(`      Cuentas Sociales: ${socialRes.rows[0].count}`);
        console.log(`      Posts: ${postsRes.rows[0].count}`);
      }
    }

  } catch (err) {
    console.error("Error en diagnóstico:", err);
  } finally {
    await client.end();
  }
}

diagnose();
