(function () {
  const btn = document.getElementById("submit");
  btn.addEventListener("click", (event) => {
    const userName = document.getElementById("user-name").value;
    if (!userName) {
      return;
    }

    axios
      .post(`/lists/create`, {
        user_id: userName,
        href: location.href,
      })
      .then((value) => {
        if (value.data.url) {
          window.location.href = value.data.url;
        } else if (value.data.message) {
          window.alert(value.data.message);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
})();
