import app, { allowedOrigins } from "./src/app.js";

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`   Mode:    ${process.env.NODE_ENV ?? "development"}`);
  console.log(`   Origins: ${allowedOrigins.join(", ")}\n`);
});

export default app;
