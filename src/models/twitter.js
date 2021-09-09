import axios from "axios";
import crypto from "crypto";
import OAuth from "oauth-1.0a";
import { parse } from "query-string";

/**
 * 認証
 */
export class TwitterOauth {
  constructor(config) {
    this.oauth = OAuth({
      consumer: {
        key: config.consumerKey,
        secret: config.consumerSecret,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });
  }

  /**
   * リクエストトークンを取得する。
   * @param {*} callbackUrl
   * @returns
   */
  async fetchRequestToken(callbackUrl) {
    const url = new URL("https://api.twitter.com/oauth/request_token");
    url.searchParams.append("oauth_callback", callbackUrl);

    const request = {
      url: url.toString(),
      method: "POST",
    };

    const result = await axios.request({
      method: request.method,
      url: request.url,
      headers: this.oauth.toHeader(this.oauth.authorize(request)),
    });

    // key1=value1&key2=value2&...の形でデータが返ってくるのでパースする。
    return parse(result.data);
  }

  /**
   * アクセストークンを取得する。
   * @param {*} oauthToken
   * @param {*} oauthVerifier
   * @returns
   */
  async fetchAccessToken(oauthToken, oauthVerifier) {
    const url = new URL("https://api.twitter.com/oauth/access_token");
    url.searchParams.append("oauth_verifier", oauthVerifier);

    const request = {
      url: url.toString(),
      method: "POST",
    };

    const result = await axios.request({
      method: request.method,
      url: request.url,
      headers: this.oauth.toHeader(
        this.oauth.authorize(request, {
          key: oauthToken,
          secret: oauthVerifier,
        })
      ),
    });

    // key1=value1&key2=value2&...の形でデータが返ってくるのでパースする。
    return parse(result.data);
  }
}

export class Users {
  constructor(config) {
    this.config = config;
  }

  /**
   * ユーザー情報を取得する。
   * @param {*} screenName
   * @returns
   */
  async show(screenName) {
    try {
      const result = await axios.get(
        "https://api.twitter.com/1.1/users/show.json",
        {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
          },
          params: {
            screen_name: screenName,
          },
        }
      );
      return result.data;
    } catch (error) {
      return null;
    }
  }
}

export class Friends {
  constructor(config) {
    this.config = config;
  }

  /**
   * フォローしているアカウントのID一覧を取得する。
   * @param {*} screenName
   * @returns
   */
  async fetchIds(screenName) {
    let ret = [];
    let cursor = "-1";

    // 一度に取得できる上限値があるため1000件ごとに取得する。
    while (cursor !== "0") {
      const result = await axios.get(
        "https://api.twitter.com/1.1/friends/ids.json",
        {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
          },
          params: {
            screen_name: screenName,
            stringify_ids: "true",
            cursor: cursor,
            count: 1000,
          },
        }
      );

      const data = result.data;
      ret = ret.concat(data.ids);
      cursor = data["next_cursor_str"];
    }
    return ret;
  }
}

export class Lists {
  constructor(config) {
    this.oauth = OAuth({
      consumer: {
        key: config.consumerKey,
        secret: config.consumerSecret,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });

    this.authorization = (request) => {
      return this.oauth.authorize(request, {
        key: config.accessToken,
        secret: config.accessTokenSecret,
      });
    };
  }

  /**
   * リストを作成する。
   * @param {*} mode
   * @param {*} description
   * @returns
   */
  async create(mode, description) {
    const url = new URL("https://api.twitter.com/1.1/lists/create.json");
    url.searchParams.append("name", "TL再現リスト");
    url.searchParams.append("mode", mode);
    url.searchParams.append("description", description);

    const request = {
      url: url.toString(),
      method: "POST",
    };

    const list = await axios.request({
      method: request.method,
      url: request.url,
      headers: this.oauth.toHeader(this.authorization(request)),
    });

    return list.data.id_str;
  }

  /**
   * リストにユーザーを複数追加する。
   * @param {*} list_id
   * @param {*} user_id
   * @returns
   */
  async addMembers(list_id, user_id) {
    const sliceByNumber = (array, number) => {
      const length = Math.ceil(array.length / number);
      return new Array(length)
        .fill()
        .map((_, i) => array.slice(i * number, (i + 1) * number));
    };

    // 100件ずつ登録する。
    await Promise.all(
      sliceByNumber(user_id, 100).map(async (value) => {
        const url = new URL(
          "https://api.twitter.com/1.1/lists/members/create_all.json"
        );
        url.searchParams.append("list_id", list_id);
        url.searchParams.append("user_id", value.join(","));

        const request = {
          url: url.toString(),
          method: "POST",
        };

        await axios.request({
          method: request.method,
          url: request.url,
          headers: this.oauth.toHeader(this.authorization(request)),
        });
      })
    );
  }
}
