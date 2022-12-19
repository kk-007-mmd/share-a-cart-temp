(async () => {
  const HOST = "https://edee-103-251-59-253.in.ngrok.io";
  const qs = (selector) => document.querySelector(selector);
  const show = (selector) => (selector.style.display = "block");

  const copyToClipboard = (str) => {
    const el = document.createElement("textarea");
    el.value = str;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  const Shopify = {
    getCart() {
      return new Promise((resolve, reject) => {
        fetch("/cart.json")
          .then((res) => res.json())
          .then((data) => resolve(data))
          .catch((err) => reject(err));
      });
    },
    generatePayloadFromSACCart(sacCart) {
      const payload = {};
      const items = (sacCart?.items || []).map((item) => ({
        id: +item.asin,
        quantity: +item.quantity,
      }));
      payload.items = items;
      return payload;
    },
    appendItemsToCart(payload) {
      return new Promise((resolve, reject) => {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        var requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: JSON.stringify(payload),
          redirect: "follow",
        };
        fetch("/cart/add.json", requestOptions)
          .then((res) => res.json())
          .then((data) => resolve(data))
          .catch((err) => reject(err));
      });
    },
  };

  const SAC = {
    createCart(cart) {
      return new Promise((resolve, reject) => {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        var requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: JSON.stringify({ cart }),
          redirect: "follow",
        };

        fetch(`${HOST}/api/cart`, requestOptions)
          .then((response) => response.json())
          .then((result) => resolve(result))
          .catch((error) => reject(error));
      });
    },
    getCart(cartId) {
      return new Promise((resolve, reject) => {
        fetch(`${HOST}/api/cart?cartId=${cartId}`)
          .then((response) => response.json())
          .then((result) => resolve(result.data))
          .catch((error) => reject(error));
      });
    },
    generateCartFromShopifyCart(shopifyCart, { shop } = {}) {
      const sacCart = {};
      sacCart.vendor = "shopify";
      sacCart.ap = "https://" + (shop || window.Shopify.shop);
      sacCart.ccy = shopifyCart.currency;
      sacCart.cart = shopifyCart.items.map((item) => ({
        asin: item.variant_id,
        name: item.title,
        img: item.image,
        quantity: item.quantity,
        price: item.price / 100,
        productId: `/products/${item.handle}`, //item.product_id
        sku: item.sku,
      }));

      console.log("sacCart", sacCart);
      return sacCart;
    },
  };

  const handleShareACart = async (evant, shareACartBtn) => {
    if (shareACartBtn) shareACartBtn.textContent = "Creating...";
    try {
      const cart = await Shopify.getCart();
      const cartResponse = await SAC.createCart(
        SAC.generateCartFromShopifyCart(cart)
      );
      const cartId = cartResponse.data.cartid;

      if (!cartId) {
        return;
      }

      const shareACartModal = qs("#sac-share-a-cart-modal");
      if (!shareACartModal) {
        return;
      }
      //show the modal
      shareACartModal.classList.add("sac-modal-show");

      const cartLink = `https://share-a-cart.com/get/${cartId}`;
      const cartShareLink = `https://share-a-cart.com/share/${cartId}`;

      const modalCartLink = qs("#sac-cart-link");
      const shareLinkBtn = qs("#sac-share-link-btn");
      const emailLinkBtn = qs("#sac-email-link-btn");
      const copyLinkBtn = qs("#sac-copy-link-btn");
      const closeModalBtn = qs("#sac-modal-close-btn");

      if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
          shareACartModal.classList.remove("sac-modal-show");
        });
      }

      if (modalCartLink) {
        modalCartLink.textContent = cartLink;
      }

      if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
          copyToClipboard(cartLink);
          const defaultValue = copyLinkBtn.textContent;
          copyLinkBtn.textContent = "Link Copied !";
          setTimeout(() => {
            if (copyLinkBtn) copyLinkBtn.textContent = defaultValue;
          }, 2000);
        });
      }

      if (shareLinkBtn) {
        shareLinkBtn.addEventListener("click", () => {
          window.open(cartShareLink, "_blank").focus();
        });
      }

      if (emailLinkBtn) {
        emailLinkBtn.addEventListener("click", () => {
          window.open(
            `mailto:mail@example.com?subject=cart for ${Shopify.shop}&body=${cartLink}`
          );
        });
      }
    } catch (error) {
      console.log("Error in handleShareACart", error);
    } finally {
      if (shareACartBtn) shareACartBtn.textContent = "Share a cart";
    }
  };

  const addShareACartBtn = async () => {
    try {
      if (shareACartBtn) {
        const shopifyCart = await Shopify.getCart();
        if (shopifyCart?.items?.length) {
          show(shareACartBtn);
          shareACartBtn.addEventListener("click", (e) =>
            handleShareACart(e, shareACartBtn)
          );
        }
      }
    } catch (error) {
      console.log("error addShareACartBtn", error);
    }
  };

  const handleSharedCart = async (cartId) => {
    try {
      if (shareACartBtn) shareACartBtn.textContent = "...";
      const sacCart = await SAC.getCart(cartId);
      const payload = Shopify.generatePayloadFromSACCart(sacCart);
      if (payload.items.length) {
        if (shareACartBtn) shareACartBtn.textContent = "Adding Items...";
        await Shopify.appendItemsToCart(payload);
        window.location.href = "/cart";
      }
    } catch (error) {
      console.log("Error in handleSharedCart", error);
      window.location.href = window.location.pathname;
    } finally {
      if (shareACartBtn) shareACartBtn.textContent = "Share a cart";
    }
  };

  const shareACartBtn = qs("#sac-share-a-cart-btn");
  addShareACartBtn();
  const cartId = new URLSearchParams(window.location.search).get("sacId");
  if (cartId) {
    handleSharedCart(cartId);
  }
})();
