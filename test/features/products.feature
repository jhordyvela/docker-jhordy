Feature: Products API
  As a client of the ecommerce backend
  I want to create and list products through REST endpoints

  Scenario: Create a product through POST /api/products
    Given the product catalog is empty
    When I send a POST request to /api/products with:
      | nombre      | Arroz premium |
      | descripcion | Bolsa de 1 kg |
      | precio      | 12.5          |
      | stock       | 20            |
    Then the response status should be 201
    And the response body should contain the created product

  Scenario: List products after creating one
    Given the product catalog is empty
    When I send a POST request to /api/products with:
      | nombre      | Aceite vegetal |
      | descripcion | Botella de 1L  |
      | precio      | 14.9           |
      | stock       | 8              |
    And I send a GET request to /api/products
    Then the response status should be 200
    And the catalog should contain 1 product