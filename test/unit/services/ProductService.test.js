import { jest } from '@jest/globals';
import ProductService from '../../../src/services/ProductService.js';

describe('ProductService', () => {
  const createDbMock = () => ({
    query: jest.fn(),
  });

  test('getAll returns all products', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({ rows: [{ id: 1, nombre: 'Arroz' }] });

    const service = new ProductService(db);
    const products = await service.getAll();

    expect(products).toEqual([{ id: 1, nombre: 'Arroz' }]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('FROM productos');
  });

  test('getById returns one product by id', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({ rows: [{ id: 7, nombre: 'Leche' }] });

    const service = new ProductService(db);
    const product = await service.getById(7);

    expect(product).toEqual({ id: 7, nombre: 'Leche' });
    expect(db.query).toHaveBeenCalledWith(expect.any(String), [7]);
  });

  test('getById returns null when the product does not exist', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({ rows: [] });

    const service = new ProductService(db);
    const product = await service.getById(999);

    expect(product).toBeNull();
  });

  test('saveProduct inserts a product and returns the created row', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({
      rows: [
        {
          id: 10,
          nombre: 'Aceite',
          descripcion: 'Botella 1L',
          precio: 12.5,
          imagen_url: null,
          categoria_id: 3,
          stock: 4,
        },
      ],
    });

    const service = new ProductService(db);
    const created = await service.saveProduct({
      nombre: ' Aceite ',
      descripcion: 'Botella 1L',
      precio: '12.5',
      categoria_id: 3,
      stock: 4,
    });

    expect(created).toEqual({
      id: 10,
      nombre: 'Aceite',
      descripcion: 'Botella 1L',
      precio: 12.5,
      imagen_url: null,
      categoria_id: 3,
      stock: 4,
    });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(['Aceite', 'Botella 1L', 12.5, null, 3, 4]);
  });

  test('saveProduct handles missing optional fields', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({
      rows: [
        {
          id: 11,
          nombre: '',
          descripcion: null,
          precio: 0,
          imagen_url: null,
          categoria_id: null,
          stock: 0,
        },
      ],
    });

    const service = new ProductService(db);
    const created = await service.saveProduct({});

    expect(created).toEqual({
      id: 11,
      nombre: '',
      descripcion: null,
      precio: 0,
      imagen_url: null,
      categoria_id: null,
      stock: 0,
    });
    const params = db.query.mock.calls[0][1];
    expect(params[0]).toBe('');
    expect(params[1]).toBeNull();
    expect(Number.isNaN(params[2])).toBe(true);
    expect(params[3]).toBeNull();
    expect(params[4]).toBeNull();
    expect(params[5]).toBe(0);
  });

  test('deleteProduct deletes a product and returns the removed row', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({
      rows: [
        { id: 5, nombre: 'Pan', descripcion: null, precio: 2, imagen_url: null, categoria_id: null, stock: 1 },
      ],
    });

    const service = new ProductService(db);
    const deleted = await service.deleteProduct(5);

    expect(deleted).toEqual({
      id: 5,
      nombre: 'Pan',
      descripcion: null,
      precio: 2,
      imagen_url: null,
      categoria_id: null,
      stock: 1,
    });
    expect(db.query).toHaveBeenCalledWith(expect.any(String), [5]);
  });

  test('deleteProduct returns null when the product does not exist', async () => {
    const db = createDbMock();
    db.query.mockResolvedValue({ rows: [] });

    const service = new ProductService(db);
    const deleted = await service.deleteProduct(404);

    expect(deleted).toBeNull();
  });
});