import { Router } from "express";
const router = Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  const userId = req.session["user_id"];
  req.session["user_id"] = null;
  res.render("index", {
    title: "リスト作成ツール",
    user: userId,
  });
});

export default router;
