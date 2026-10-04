let products = [];
let selected = null;

async function loadProducts() {
  const response = await fetch("/api/products");

  products = await response.json();

  render("All");
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}

function render(type) {

  const list =
    type === "All"
      ? products
      : products.filter(p => p.type === type);

  document.querySelector("#products").innerHTML =
    list.map(p => `

      <article class="card">

        <div class="type">
          ${escapeHtml(p.type)}
        </div>

        <h3>
          ${escapeHtml(p.name)}
        </h3>

        <p>
          ${escapeHtml(p.description)}
        </p>

        <div class="price">
          $${Number(p.price).toFixed(2)}
          <small>
            / ${escapeHtml(p.duration)}
          </small>
        </div>

        <div class="stock">
          ${
            p.stock > 0
              ? `${p.stock} available`
              : "Out of stock"
          }
        </div>

        <button
          class="btn primary"
          ${p.stock <= 0 ? "disabled" : ""}
          onclick="openOrder('${p.id}')"
        >
          Order Now
        </button>

      </article>

    `).join("");
}

function openOrder(id) {

  selected = products.find(p => p.id === id);

  document.querySelector("#selected").textContent =
    `${selected.name} — $${Number(selected.price).toFixed(2)}`;

  document.querySelector("#email").value = "";

  document.querySelector("#result").textContent = "";

  document.querySelector("#modal")
    .classList.remove("hidden");
}

document.querySelector("#close").onclick = () => {
  document.querySelector("#modal")
    .classList.add("hidden");
};

document.querySelector("#modal").addEventListener(
  "click",
  event => {

    if (event.target.id === "modal") {
      event.target.classList.add("hidden");
    }

  }
);

document.querySelectorAll(".filter").forEach(button => {

  button.onclick = () => {

    document
      .querySelectorAll(".filter")
      .forEach(x => x.classList.remove("active"));

    button.classList.add("active");

    render(button.dataset.type);
  };

});

document.querySelector("#orderBtn").onclick =
  async () => {

    const email =
      document.querySelector("#email").value.trim();

    const result =
      document.querySelector("#result");

    if (!email.includes("@")) {

      result.className = "result err";

      result.textContent =
        "Enter a valid email.";

      return;
    }

    const response = await fetch(
      "/api/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: selected.id,
          email
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      result.className = "result err";

      result.textContent =
        data.error || "Something went wrong.";

      return;
    }

    result.className = "result ok";

    result.textContent =
      `Order ${data.order.id} created. ${data.message}`;

    await loadProducts();
  };

loadProducts();