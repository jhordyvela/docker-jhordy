import { Before, Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'node:assert/strict';
import { createTestApp } from '../support/createTestApp.js';

let app;
let agent;
let productService;
let response;

Before(() => {
  const testContext = createTestApp();
  app = testContext.app;
  productService = testContext.productService;
  agent = request(app);
  response = null;
});

Given('the product catalog is empty', async () => {
  const products = await productService.getAll();
  assert.equal(products.length, 0);
});

When(/^I send a POST request to \/api\/products with:$/, async function (dataTable) {
  const payload = dataTable.rowsHash();
  response = await agent.post('/api/products').send(payload);
});

When(/^I send a GET request to \/api\/products$/, async () => {
  response = await agent.get('/api/products');
});

Then('the response status should be {int}', (statusCode) => {
  assert.equal(response.status, statusCode);
});

Then('the response body should contain the created product', () => {
  assert.equal(typeof response.body.nombre, 'string');
  assert.equal(typeof response.body.descripcion, 'string');
  assert.equal(typeof response.body.precio, 'number');
  assert.equal(typeof response.body.stock, 'number');
});

Then('the catalog should contain {int} product', (count) => {
  assert.equal(response.body.length, count);
});