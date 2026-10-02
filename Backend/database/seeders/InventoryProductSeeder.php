<?php

namespace Database\Seeders;

use App\Models\InventoryProduct;
use Illuminate\Database\Seeder;

class InventoryProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['BRK-2P-20A', 'Breaker termomagnético 2 polos 20 A', 'Interruptor termomagnético de 2 polos, 20 A, curva C, 120/240 V, montaje en riel DIN; protección contra sobrecarga y cortocircuito.', 'Protecciones', 'unidad', 12.50, 18, 4],
            ['BRK-2P-40A', 'Breaker termomagnético 2 polos 40 A', 'Interruptor termomagnético bipolar de 40 A, curva C, capacidad de interrupción 10 kA y montaje en riel DIN para circuitos de mayor carga.', 'Protecciones', 'unidad', 21.50, 8, 2],
            ['BRK-3P-40A', 'Breaker termomagnético 3 polos 40 A', 'Interruptor termomagnético tripolar, 40 A, curva C, 240/415 V, montaje en riel DIN; para circuitos trifásicos.', 'Protecciones', 'unidad', 32.80, 8, 2],
            ['BRK-1P-15A', 'Breaker termomagnético 1 polo 15 A', 'Interruptor termomagnético monopolar de 15 A, curva C, 120/240 V, riel DIN.', 'Protecciones', 'unidad', 6.20, 25, 5],
            ['BRK-1P-20A', 'Breaker termomagnético 1 polo 20 A', 'Interruptor termomagnético monopolar de 20 A, curva C, 120/240 V, riel DIN.', 'Protecciones', 'unidad', 6.50, 20, 5],
            ['BRK-2P-30A', 'Breaker termomagnético 2 polos 30 A', 'Interruptor termomagnético bipolar de 30 A, curva C, capacidad de interrupción 10 kA, riel DIN.', 'Protecciones', 'unidad', 17.90, 10, 3],
            ['RCD-2P-40A', 'Interruptor diferencial 2 polos 40 A 30 mA', 'Protección diferencial bipolar de 40 A y sensibilidad 30 mA, tipo AC, para protección de personas ante fugas a tierra.', 'Protecciones', 'unidad', 39.00, 6, 2],
            ['SPD-T2-1P', 'Protector contra sobretensiones tipo 2', 'Descargador de sobretensión transitoria tipo 2, 1 polo + neutro, indicador visual de estado y montaje DIN.', 'Protecciones', 'unidad', 28.50, 5, 2],
            ['WIRE-14-AWG', 'Cable de cobre THHN calibre 14 AWG', 'Conductor de cobre sólido o cableado THHN/THWN-2, calibre 14 AWG, aislamiento 600 V resistente al calor y humedad.', 'Conductores', 'metro', 0.42, 240, 50],
            ['WIRE-12-AWG', 'Cable de cobre THHN calibre 12 AWG', 'Conductor de cobre THHN/THWN-2 calibre 12 AWG, 600 V, aislamiento resistente a humedad y temperatura de operación 90 °C.', 'Conductores', 'metro', 0.68, 180, 40],
            ['WIRE-10-AWG', 'Cable de cobre THHN calibre 10 AWG', 'Conductor de cobre THHN/THWN-2 calibre 10 AWG para circuitos de mayor carga, aislamiento 600 V.', 'Conductores', 'metro', 1.12, 120, 30],
            ['WIRE-8-AWG', 'Cable de cobre THHN calibre 8 AWG', 'Conductor de cobre cableado THHN/THWN-2 calibre 8 AWG, 600 V, apropiado para alimentadores y cargas de potencia.', 'Conductores', 'metro', 2.10, 80, 20],
            ['WIRE-6-AWG', 'Cable de cobre THHN calibre 6 AWG', 'Conductor de cobre cableado THHN/THWN-2 calibre 6 AWG, 600 V, para alimentadores de alta corriente.', 'Conductores', 'metro', 3.20, 60, 15],
            ['WIRE-THHN-12-R', 'Cable THHN calibre 12 AWG rojo', 'Conductor de cobre THHN/THWN-2 calibre 12 AWG con aislamiento rojo para identificación de fase, tensión nominal 600 V.', 'Conductores', 'rollo', 68.00, 8, 2],
            ['WIRE-THHN-12-B', 'Cable THHN calibre 12 AWG negro', 'Conductor de cobre THHN/THWN-2 calibre 12 AWG con aislamiento negro para fase, tensión nominal 600 V.', 'Conductores', 'rollo', 68.00, 8, 2],
            ['WIRE-THHN-12-G', 'Cable THHN calibre 12 AWG verde', 'Conductor de cobre THHN/THWN-2 calibre 12 AWG con aislamiento verde para puesta a tierra, tensión nominal 600 V.', 'Conductores', 'rollo', 68.00, 6, 2],
            ['CONDUIT-PVC-1/2', 'Tubo conduit PVC eléctrico 1/2 pulgada', 'Tubería conduit de PVC rígido de 1/2 pulgada, 3 m de largo, autoextinguible, para canalización eléctrica embutida o expuesta.', 'Canalización', 'tubo', 2.35, 45, 10],
            ['CONDUIT-PVC-3/4', 'Tubo conduit PVC eléctrico 3/4 pulgada', 'Tubería conduit de PVC rígido de 3/4 pulgada, 3 m de largo, autoextinguible, para canalización eléctrica.', 'Canalización', 'tubo', 3.20, 35, 8],
            ['CONDUIT-PVC-1', 'Tubo conduit PVC eléctrico 1 pulgada', 'Tubería conduit de PVC rígido de 1 pulgada, 3 m de largo, resistente a la corrosión para instalaciones eléctricas.', 'Canalización', 'tubo', 4.75, 24, 6],
            ['CONDUIT-EMT-3/4', 'Tubo conduit EMT galvanizado 3/4 pulgada', 'Tubo EMT galvanizado de 3/4 pulgada, 3 m de largo, para canalización metálica interior.', 'Canalización', 'tubo', 7.90, 15, 4],
            ['BOX-4X2', 'Caja rectangular eléctrica 4 x 2 pulgadas', 'Caja rectangular de PVC para empotrar mecanismos eléctricos, entradas para conduit y fijación estándar.', 'Canalización', 'unidad', 0.85, 60, 15],
            ['BOX-4X4', 'Caja cuadrada eléctrica 4 x 4 pulgadas', 'Caja cuadrada de PVC de 4 x 4 pulgadas para derivación y montaje de accesorios eléctricos.', 'Canalización', 'unidad', 1.20, 40, 10],
            ['OUTLET-DUP-15A', 'Tomacorriente doble polarizado 15 A', 'Receptáculo dúplex con puesta a tierra, 15 A, 125 V, terminales de conexión por tornillo y placa estándar.', 'Tomacorrientes e interruptores', 'unidad', 3.80, 30, 8],
            ['OUTLET-GFCI-20A', 'Tomacorriente GFCI 20 A', 'Receptáculo dúplex con protección GFCI de 20 A, 125 V, botones de prueba y restablecimiento y protección de falla a tierra.', 'Tomacorrientes e interruptores', 'unidad', 18.50, 7, 2],
            ['SWITCH-1G', 'Interruptor sencillo 1 polo', 'Interruptor de pared sencillo de 1 polo, 15 A, 120/277 V, mecanismo y placa de acabado blanco.', 'Tomacorrientes e interruptores', 'unidad', 2.60, 25, 6],
            ['SWITCH-3WAY', 'Interruptor conmutador de escalera', 'Interruptor conmutador de 3 vías, 15 A, 120/277 V, para control de iluminación desde dos ubicaciones.', 'Tomacorrientes e interruptores', 'unidad', 4.20, 15, 4],
            ['LED-BULB-9W', 'Lámpara LED 9 W luz cálida', 'Bombilla LED de 9 W, base E27, 800 lúmenes, luz cálida 3000 K, 100-240 V, vida útil nominal 15 000 h.', 'Iluminación', 'unidad', 2.40, 35, 8],
            ['LED-PANEL-18W', 'Panel LED empotrable 18 W', 'Panel LED circular empotrable de 18 W, luz neutra 4000 K, 1500 lúmenes, driver incluido y alimentación 100-240 V.', 'Iluminación', 'unidad', 11.50, 12, 3],
            ['LED-FLOOD-50W', 'Reflector LED exterior 50 W', 'Reflector LED de 50 W para exterior, 4000 lúmenes, 6500 K, protección IP65 y soporte orientable.', 'Iluminación', 'unidad', 19.90, 8, 2],
            ['GROUND-ROD-5/8', 'Varilla copperweld puesta a tierra 5/8 x 2.4 m', 'Electrodo de acero recubierto de cobre de 5/8 pulgada por 2.4 m para sistema de puesta a tierra.', 'Puesta a tierra', 'unidad', 16.00, 10, 3],
            ['GROUND-CLAMP-5/8', 'Abrazadera para varilla de tierra 5/8 pulgada', 'Abrazadera de bronce para conectar conductor de cobre a varilla de puesta a tierra de 5/8 pulgada.', 'Puesta a tierra', 'unidad', 3.50, 12, 3],
            ['TAPE-ELECTRICAL', 'Cinta aislante eléctrica PVC 19 mm', 'Cinta aislante de PVC autoextinguible, 19 mm x 18 m, resistencia dieléctrica para empalmes y marcación.', 'Accesorios', 'rollo', 1.25, 50, 12],
            ['CONNECTOR-12AWG', 'Conector de empalme para cable 12 AWG', 'Conector aislado para empalmar conductores de cobre calibre 12 AWG, uso en cajas de derivación.', 'Accesorios', 'unidad', 0.18, 100, 25],
            ['PANEL-12C', 'Tablero eléctrico 12 circuitos', 'Centro de carga monofásico de 12 espacios/circuitos, barras de neutro y tierra, gabinete para montaje empotrado.', 'Tableros', 'unidad', 48.00, 4, 1],
            ['PANEL-24C', 'Tablero eléctrico 24 circuitos', 'Centro de carga de 24 espacios/circuitos, barras de neutro y tierra, puerta y gabinete metálico para instalación empotrada.', 'Tableros', 'unidad', 78.00, 3, 1],
            ['CONTACTOR-3P-25A', 'Contactor trifásico 25 A bobina 220 V', 'Contactor de potencia tripolar 25 A, bobina de mando 220 V AC, contactos auxiliares para maniobra de motores.', 'Control eléctrico', 'unidad', 29.50, 5, 2],
        ];

        foreach ($products as [$sku, $name, $description, $category, $unit, $price, $stock, $minimum]) {
            $product = InventoryProduct::firstOrNew(['sku' => $sku]);
            if (! $product->exists) {
                $product->stock_quantity = $stock;
                $product->minimum_stock = $minimum;
                $product->active = true;
            }

            $product->fill([
                'name' => $name,
                'description' => $description,
                'category' => $category,
                'unit' => $unit,
                'unit_price' => $price,
            ])->save();
        }
    }
}
