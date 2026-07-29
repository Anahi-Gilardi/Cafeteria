# Contrato del autorizador fiscal interno

La Edge Function mantiene autenticación, roles, estados, persistencia e idempotencia. El
servicio configurado en `ARCA_AUTHORIZER_URL` debe implementar la conexión técnica con WSAA
y WSMTXCA y no debe ser accesible desde Internet sin autenticación.

Recibe `POST` con `Authorization: Bearer ARCA_AUTHORIZER_TOKEN` e
`Idempotency-Key`. El cuerpo contiene ambiente, CUIT emisor, punto de venta, tipo de
comprobante, receptor, importes e ítems obtenidos por el servidor desde la comanda.

Debe:

- firmar el Login Ticket Request con certificado y clave privada protegidos;
- reutilizar el TA hasta su vencimiento;
- consultar y serializar el último comprobante por CUIT/punto de venta/tipo;
- enviar WSMTXCA con detalle de ítems e IVA fiscalmente configurado;
- devolver siempre el mismo resultado para una misma clave de idempotencia;
- conciliar una repetición posterior a timeout sin emitir un duplicado.

Respuesta esperada:

```json
{
  "result": "A",
  "cae": "74123456789012",
  "caeExpiration": "2026-08-08",
  "invoiceNumber": 123,
  "observations": [],
  "errors": []
}
```

`result` admite `A`, `O` o `R`. Una respuesta `O` debe incluir CAE, vencimiento y número;
una `R` debe incluir errores. La Edge Function rechaza cualquier respuesta aprobada que no
contenga esos campos y la marca `uncertain` para conciliación.
