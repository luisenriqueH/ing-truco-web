# Jerarquía de Cartas (Truco Venezolano)

Esta tabla define el poder de cada carta en el juego. Las cartas están ordenadas de **mayor a menor** valor.

| Rango | Carta(s) | Valor en Motor | Notas |
| :--- | :--- | :--- | :--- |
| 1 | **Perico** | 100 | Caballo (11) del palo de la Vira* |
| 2 | **Perica** | 90 | Sota (10) del palo de la Vira* |
| 3 | **As de Espadas** | 80 | |
| 4 | **As de Bastos** | 70 | |
| 5 | **7 de Espadas** | 60 | |
| 6 | **7 de Oros** | 50 | |
| 7 | **3** (todos) | 40 | |
| 8 | **2** (todos) | 30 | |
| 9 | **As de Oros/Copas**| 20 | |
| 10 | **12** (Rey) | 15 | |
| 11 | **11** (Caballo) | 14 | |
| 12 | **10** (Sota) | 13 | |
| 13 | **7 de Bastos/Copas**| 10 | |
| 14 | **6** (todos) | 8 | |
| 15 | **5** (todos) | 5 | |
| 16 | **4** (todos) | 2 | |

*\*Si la Vira es un 11, el Perico pasa a ser el Rey (12). Si la Vira es un 10, la Perica pasa a ser el Rey (12).*

---

### Análisis del Error Reciente
En el caso reportado:
- Jugador A: **3 de Oros** (Valor 40)
- Jugador B: **2 de Bastos** (Valor 30)
- Jugador C: **6 de Oros** (Valor 8)
- Jugador D: **5 de Espadas** (Valor 5)

**Resultado Esperado**: Gana el **3 de Oros**.
**Causa del Empate**: El motor no estaba reconociendo los nombres de las cartas "dos", "tres", etc., asignándoles un valor de 0 a todas, lo que resultaba en un empate técnico.
