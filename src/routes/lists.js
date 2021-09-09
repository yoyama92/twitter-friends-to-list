import { Router } from "express";
import { TwitterOauth, Users, Friends, Lists } from "../models/twitter";

const router = Router();

const consumerKey = process.env["CONSUMER_KEY"];
const consumerSecret = process.env["CONSUMER_SECRET"];
const bearerToken = process.env["BEARER_TOKEN"];

router.get("/callback", function (req, res, next) {
  (async () => {
    const oauthVerifier = req.query["oauth_verifier"];
    const oauthToken = req.query["oauth_token"];

    // 最初の呼び出しでセッションに入れておいたIDを取得する。
    const screenName = req.session["user_id"];

    if (!(oauthVerifier && oauthToken && screenName)) {
      req.session["user_id"] = null;
      res.redirect("/");
      return;
    }

    const users = new Users({ bearerToken: bearerToken });
    const user = await users.show(screenName);

    if (!user) {
      req.session["user_id"] = null;
      res.redirect("/");
      return;
    }

    const twitterOauth = new TwitterOauth({
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
    });

    const value = await twitterOauth.fetchAccessToken(
      oauthToken,
      oauthVerifier
    );

    const lists = new Lists({
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      accessToken: value["oauth_token"],
      accessTokenSecret: value["oauth_token_secret"],
    });

    const listId = await lists.create(user.name, "private", user.name);

    // TLを再現するためにフォロー取得元のユーザーをリストに追加する。
    await lists.addMembers(listId, [user.id_str]);

    // フォロー一覧取得
    const friends = new Friends({ bearerToken: bearerToken });
    const result = await friends.fetchIds(screenName);

    // リストに追加
    await lists.addMembers(listId, result);

    res.redirect("/");
  })().catch(next);
});

router.post("/create", function (req, res, next) {
  (async () => {
    const userId = req.body["user_id"];
    const href = req.body["href"];
    const origin = new URL(href).origin;

    const users = new Users({ bearerToken: bearerToken });
    const user = await users.show(userId);
    if (!user) {
      res.send({
        message: "対象ユーザーが存在しません。",
      });
      return;
    }

    const twitterOauth = new TwitterOauth({
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
    });

    // コールバック先で使うためにユーザーIDをセッションに入れておく。
    req.session["user_id"] = userId;
    const value = await twitterOauth.fetchRequestToken(
      `${origin}/lists/callback`
    );
    res.send({
      url: `https://api.twitter.com/oauth/authorize?oauth_token=${value["oauth_token"]}`,
    });
  })().catch(next);
});

export default router;
