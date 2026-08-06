import React from "react";
import ReactDOMServer from "react-dom/server";
import App from "./App";
import AdminHub from "./components/AdminHub";
import KitchenDisplay from "./components/KitchenDisplay";

// Mock minimal browser globals for SSR testing
(global as any).window = {
  location: {
    hash: "#/cocina",
    search: "",
    pathname: "/",
    href: "https://cafeteria-ten-pied.vercel.app/#/cocina"
  },
  history: {
    replaceState() {}
  },
  addEventListener() {},
  removeEventListener() {},
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  }
};

(global as any).document = {
  body: { style: {} },
  getElementById() { return null; },
  addEventListener() {},
  removeEventListener() {}
};

async function runSSRTest() {
  console.log("=== RUNNING REACT RENDER-TO-STRING TEST FOR APP AND ADMINHUB ===");
  try {
    console.log("1. Testing <App /> renderToString...");
    const appHtml = ReactDOMServer.renderToString(React.createElement(App));
    console.log("✅ App renderToString passed! Output length:", appHtml.length);

    console.log("2. Testing <AdminHub /> renderToString with mock props...");
    const adminHubHtml = ReactDOMServer.renderToString(
      React.createElement(AdminHub, {
        orders: [],
        menuItems: [],
        onOrderStatusUpdate: () => {},
        onArchiveOrder: async () => true,
        onDeleteOrder: async () => true,
        onUpdateOrders: () => {},
        onUpdateMenu: () => {},
        onShowNotification: () => {},
        clientAccounts: [],
        onUpdateClientAccounts: () => {},
        onClosePanel: () => {},
        currentUser: { id: "test", authUserId: "test", email: "a@b.com", name: "Chef", role: "barista" },
        bookings: []
      })
    );
    console.log("✅ AdminHub renderToString passed! Output length:", adminHubHtml.length);

    console.log("3. Testing <KitchenDisplay /> renderToString...");
    const kdHtml = ReactDOMServer.renderToString(
      React.createElement(KitchenDisplay, {
        orders: [],
        menuItems: [],
        onOrderStatusUpdate: () => {},
        onArchiveOrder: async () => true,
        onDeleteOrder: async () => true,
        canDeleteOrders: true
      })
    );
    console.log("✅ KitchenDisplay renderToString passed! Output length:", kdHtml.length);

  } catch (err: any) {
    console.error("🚨 SSR RENDER ERROR DETECTED:", err);
    if (err.stack) console.error(err.stack);
  }
}

runSSRTest();
