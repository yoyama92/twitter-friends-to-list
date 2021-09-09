import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import createError from "http-errors";
import logger from "morgan";
import path, { dirname } from "path";
import favicon from "serve-favicon";
import { fileURLToPath } from "url";
import indexRouter from "./routes/index";
import listsRouter from "./routes/lists";
import session from "cookie-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "cdn.jsdelivr.net"],
      },
    },
  })
);

app.use(
  session({
    name: "session",
    keys: ["key1", "key2"],
    cookie: {
      secure: true,
      httpOnly: true,
    },
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));

app.use("/", indexRouter);
app.use("/lists", listsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.log(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;
