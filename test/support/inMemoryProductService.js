export class InMemoryProductService {
  constructor(initialProducts = []) {
    this.products = [...initialProducts];
    this.nextId = this.products.reduce((max, product) => Math.max(max, Number(product.id) || 0), 0) + 1;
  }

  async getAll() {
    return [...this.products];
  }

  async getById(id) {
    return this.products.find((product) => String(product.id) === String(id)) ?? null;
  }

  async saveProduct(product) {
    const created = {
      id: this.nextId++,
      nombre: product?.nombre?.trim?.() ?? product?.nombre ?? '',
      descripcion: product?.descripcion ?? null,
      precio: Number(product?.precio ?? 0),
      imagen_url: product?.imagen_url ?? null,
      categoria_id: product?.categoria_id ?? null,
      stock: Number(product?.stock ?? product?.cantidad ?? 0) || 0,
    };

    this.products.push(created);
    return created;
  }

  async deleteProduct(id) {
    const index = this.products.findIndex((product) => String(product.id) === String(id));
    if (index === -1) {
      return null;
    }

    const [deleted] = this.products.splice(index, 1);
    return deleted;
  }
}

export default InMemoryProductService;