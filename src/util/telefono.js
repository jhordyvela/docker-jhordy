const TELEFONO_REGEX = /^\d{9}$/;

export function validarTelefonoInput(rawTelefono) {
  if (rawTelefono === undefined) {
    return { provided: false, value: undefined, valid: true };
  }

  if (rawTelefono === null || rawTelefono === "") {
    return { provided: true, value: null, valid: true };
  }

  const telefono = String(rawTelefono).trim();
  if (!telefono) {
    return { provided: true, value: null, valid: true };
  }

  if (!TELEFONO_REGEX.test(telefono)) {
    return {
      provided: true,
      value: telefono,
      valid: false,
      warning: "El telefono debe contener solo numeros y tener exactamente 9 digitos",
    };
  }

  return { provided: true, value: telefono, valid: true };
}