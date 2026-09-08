import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePriceNumber, generateStorePurchaseUrl, calculateSeriesBasket } from "../src/lib/pricing/priceEngine";

test("parsePriceNumber accurately parses various Polish currency formats", () => {
  assert.equal(parsePriceNumber("44,99 zł"), 44.99);
  assert.equal(parsePriceNumber("39.50 PLN"), 39.5);
  assert.equal(parsePriceNumber("52 zł"), 52);
  assert.equal(parsePriceNumber(""), 0);
  assert.equal(parsePriceNumber("brak"), 0);
});

test("generateStorePurchaseUrl creates correct bookstore links", () => {
  const urlEmpik = generateStorePurchaseUrl("empik", "Rok 1984", "9788328716162");
  assert.match(urlEmpik, /empik\.com/);
  assert.match(urlEmpik, /9788328716162/);

  const urlTania = generateStorePurchaseUrl("taniaksiazka", "Folwark zwierzłcy");
  assert.match(urlTania, /taniaksiazka\.pl/);
});

test("calculateSeriesBasket computes single-store vs cheapest optimization", () => {
  const missing = [
    {
      id: "b1",
      title: "Tom 1",
      volume: 1,
      formatType: "hardcover" as const,
      prices: [
        { store: "Empik", formatType: "hardcover" as const, format: "Twarda", price: "30,00 zł", shipping: "0 zł", isBest: true, url: "" },
        { store: "TaniaKsiążka", formatType: "hardcover" as const, format: "Twarda", price: "35,00 zł", shipping: "9 zł", isBest: false, url: "" },
      ],
    },
    {
      id: "b2",
      title: "Tom 2",
      volume: 2,
      formatType: "hardcover" as const,
      prices: [
        { store: "Empik", formatType: "hardcover" as const, format: "Twarda", price: "40,00 zł", shipping: "0 zł", isBest: false, url: "" },
        { store: "TaniaKsiążka", formatType: "hardcover" as const, format: "Twarda", price: "25,00 zł", shipping: "9 zł", isBest: true, url: "" },
      ],
    },
  ];

  const res = calculateSeriesBasket(missing, "all");
  assert.equal(res.totalMissingBooks, 2);
  assert.equal(res.cheapestCombinedPrice, 55); // 30 + 25
  assert.ok(res.bestSingleStore);
});
