# 🤖 Agente de Integración de Pagos: Pasarela Genérica Koningo

Este agente define el protocolo para afiliar nuevos juegos o servicios al ecosistema de cobros de Koningo.

## 1. Registro del Cliente (PHP)
Todo nuevo juego debe registrarse en `domain/pay/clients.php`.

```php
'slug_juego' => [
    'name' => 'Nombre Comercial',
    'theme_color' => '#HEXCOLOR',        // Color de acento para la interfaz
    'logo_svg' => '<svg ...>...</svg>', // SVG inline del logo
    'unit_name' => 'CR',                // Nombre de la moneda (CR, Gold, etc.)
    'package_map' => [                  // Mapeo de IDs de paquetes a nombres legibles
        'pack_basic' => 'Pack de Iniciación',
    ],
    'redirect_default' => '../slug-juego/index.html'
]
```

## 2. Protocolo de Redirección (Frontend)
El cliente debe redirigir al usuario a `paypal.php` con los siguientes parámetros:

| Parámetro | Requerido | Descripción |
| :--- | :--- | :--- |
| `gid` | Sí | ID del juego registrado en `clients.php` |
| `pkg` | Sí | ID del paquete definido en el map |
| `amt` | Sí | Cantidad de unidades a acreditar |
| `prc` | Sí | Precio en USD (formato 0.00) |
| `txid` | Sí | ID de transacción único generado por el cliente |
| `ret` | No | URL de retorno personalizada (sobreescribe default) |

## 3. Entornos y Pruebas
Configurar en `domain/pay/config.php`:

- **`dev`**: Los pagos se aprueban con un solo clic mediante el botón **"Simular Pago"**. No requiere internet.
- **`sandbox`**: Requiere cuenta de pruebas de PayPal.
- **`live`**: Transacciones reales.

## 4. Validación de Retorno
Tras el pago, la pasarela redirige a la URL de retorno con:
`?payment=success&amt=[CANTIDAD]&txid=[TXID]&ppid=[ORDER_ID]`

---
> [!IMPORTANT]
> **Compatibilidad**: Si no se envía el parámetro `gid`, el sistema asume `gid=orbit` para mantener la compatibilidad con integraciones antiguas.
