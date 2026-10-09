import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    mensaje: "API de IriConfex funcionando"
  });
});

app.listen(PORT, () => {
  console.log(`API ejecutándose en el puerto ${PORT}`);
});
