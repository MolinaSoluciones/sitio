"""Crea las plantillas de Excel que se descargan desde molinasoluciones.com/plantillas/.
Uso: python3 herramientas/plantillas.py   (escribe en descargas/). Después hay que recalcular con LibreOffice
para que las fórmulas lleven su valor guardado (Google Sheets y Excel las calculan solas al abrir)."""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation

SALIDA = Path(__file__).resolve().parent.parent / 'descargas'
VINO, MAGENTA, ORO, CREMA, ROSA, TINTA, GRIS, LINEA = '6B1437', 'B5174F', 'C9A24B', 'FBF6EE', 'F6E3EA', '2A1A20', '6B5560', 'E4D8CC'
F = 'Arial'
relleno = lambda c: PatternFill('solid', start_color=c, end_color=c)
borde = Border(*(Side(style='thin', color=LINEA),) * 4)
SITIO = 'https://molinasoluciones.com'
AMARILLO = 'FFF8D6'  # celdas que llena la persona (las demás quedan bloqueadas)
ABIERTA = Protection(locked=False)


def proteger(ws):
    """Bloquea la hoja sin contraseña: solo se puede escribir en las celdas abiertas (amarillas). Deja cambiar el ancho de columnas."""
    ws.protection.sheet = True
    ws.protection.formatColumns = False
    ws.protection.formatRows = False



def encabezado(ws, titulo, sub, ancho):
    """Franja de marca arriba de la hoja."""
    for f in (1, 2, 3):
        for c in range(1, ancho + 1):
            ws.cell(f, c).fill = relleno(VINO)
    ws['A1'] = titulo; ws['A1'].font = Font(name=F, size=16, bold=True, color=CREMA)
    ws['A2'] = sub; ws['A2'].font = Font(name=F, size=10, color='E8CF9A')
    ws['A3'] = 'Molina Soluciones Digitales · molinasoluciones.com'; ws['A3'].font = Font(name=F, size=9, color='F3E6DC')
    ws.row_dimensions[1].height = 28; ws.row_dimensions[3].height = 18


def hoja_ayuda(wb, titulo, pasos, guia, src, pitch='Con Gestión de Negocio VM cada venta descuenta la existencia sola y el programa te avisa lo que está por agotarse, desde tu celular.'):
    ws = wb.create_sheet('Cómo usarla')
    ws.sheet_view.showGridLines = False
    ws.column_dimensions['A'].width = 4; ws.column_dimensions['B'].width = 92
    encabezado(ws, titulo, 'Cómo usar esta plantilla', 2)
    f = 5
    for n, (t, d) in enumerate(pasos, 1):
        ws.cell(f, 1, n).font = Font(name=F, bold=True, color=MAGENTA); ws.cell(f, 1).alignment = Alignment(vertical='top')
        ws.cell(f, 2, t).font = Font(name=F, bold=True, color=TINTA)
        ws.cell(f + 1, 2, d).font = Font(name=F, color=GRIS); ws.cell(f + 1, 2).alignment = Alignment(wrap_text=True, vertical='top')
        ws.row_dimensions[f + 1].height = 15 * (1 + len(d) // 95)
        f += 3
    ws.cell(f, 2, 'Colores').font = Font(name=F, bold=True, color=TINTA)
    ws.cell(f + 1, 2, 'Celdas amarillas: las llenas tú.'); ws.cell(f + 1, 2).font = Font(name=F, color=TINTA); ws.cell(f + 1, 2).fill = relleno(AMARILLO)
    ws.cell(f + 2, 2, 'Celdas rosadas: se calculan solas y están bloqueadas para que no se borren las fórmulas.'); ws.cell(f + 2, 2).font = Font(name=F, color=GRIS); ws.cell(f + 2, 2).fill = relleno(ROSA)
    f += 4
    ws.cell(f, 2, 'Guía paso a paso').font = Font(name=F, bold=True, color=TINTA)
    c = ws.cell(f + 1, 2, guia[0]); c.hyperlink = f'{SITIO}{guia[1]}?src={src}'; c.font = Font(name=F, color=MAGENTA, underline='single')
    f += 3
    ws.cell(f, 2, '¿Cansado de llenarla a mano?').font = Font(name=F, bold=True, color=VINO, size=12)
    ws.cell(f + 1, 2, pitch).font = Font(name=F, color=TINTA); ws.cell(f + 1, 2).alignment = Alignment(wrap_text=True, vertical='top'); ws.row_dimensions[f + 1].height = 30
    c = ws.cell(f + 2, 2, 'Probar gratis 7 días'); c.hyperlink = f'https://app.molinasoluciones.com/?src={src}'; c.font = Font(name=F, bold=True, color=MAGENTA, underline='single')
    return ws


def tabla(ws, fila, cols, calc, n):
    """Encabezados de una tabla y su formato. cols: [(título, ancho, formato)]. calc: columnas (1..) que se calculan solas."""
    for i, (t, w, _) in enumerate(cols, 1):
        c = ws.cell(fila, i, t); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(MAGENTA)
        c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='left' if i == 1 or t == 'Producto' else 'center'); c.border = borde
        ws.column_dimensions[c.column_letter].width = w
    ws.row_dimensions[fila].height = 30
    for f in range(fila + 1, fila + 1 + n):
        for i, (t, _, nf) in enumerate(cols, 1):
            c = ws.cell(f, i); c.font = Font(name=F, size=10, color=TINTA); c.border = borde
            if nf: c.number_format = nf
            if i in calc: c.fill = relleno(ROSA)
            if t != 'Producto': c.alignment = Alignment(horizontal='center')
    ws.freeze_panes = ws.cell(fila + 1, 1).coordinate
    ws.sheet_view.showGridLines = False


def resumen(ws, datos):
    """Cifras grandes arriba de la tabla: [(columna, título, fórmula, formato)]."""
    for col, t, fx, nf in datos:
        ws[col + '5'] = t; ws[col + '5'].font = Font(name=F, size=9, color=GRIS)
        ws[col + '6'] = fx; ws[col + '6'].font = Font(name=F, size=14, bold=True, color=VINO); ws[col + '6'].number_format = nf
        ws[col + '6'].alignment = Alignment(horizontal='left')


HOJA_MOV = 'Compras y ventas'
REF_MOV = "'Compras y ventas'"  # el nombre lleva espacios: entre comillas en las fórmulas


def movimientos(wb, compras, ventas, N):
    """Una sola hoja con Compras (A:E) y Ventas (G:K) lado a lado.
    Columnas ocultas M y N numeran cada producto la primera vez que aparece (M: compras 1, 2, 3…; N: ventas que no
    están en compras, 10001, 10002…), para que la hoja Productos arme sola su lista sin fórmulas de matriz.
    M7 guarda cuántos productos distintos hay en compras."""
    ws = wb.create_sheet(HOJA_MOV); ws.sheet_view.showGridLines = False
    encabezado(ws, 'Compras y ventas', 'Escribe solo en las celdas amarillas. La hoja «Productos» se llena sola.', 11)
    PRI = 9; ULT = PRI + N - 1
    num = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1='0', allow_blank=True, showErrorMessage=True, errorTitle='Solo números', error='Escribe un número de 0 en adelante.')
    fecha = DataValidation(type='date', operator='greaterThan', formula1='36526', allow_blank=True, showErrorMessage=True, errorTitle='Fecha', error='Escribe una fecha, por ejemplo 22/11/2026.')
    lista = DataValidation(type='list', formula1="Productos!$A$9:$A$208", allow_blank=True, showErrorMessage=False,
                           promptTitle='Producto', prompt='Elige uno de la lista o escribe uno nuevo.', showInputMessage=True)
    for dv in (num, fecha, lista): ws.add_data_validation(dv)
    for c0, titulo, precio, filas, color in ((1, 'COMPRAS', 'Costo unitario (L)', compras, ORO), (7, 'VENTAS', 'Precio unitario (L)', ventas, MAGENTA)):
        L = lambda k: ws.cell(1, c0 + k).column_letter
        cols = [('Fecha', 12, 'dd/mm/yyyy'), ('Producto', 26, None), ('Cantidad', 10, '#,##0.##'), (precio, 13, '#,##0.00'), ('Total (L)', 13, '#,##0.00')]
        t = ws.cell(5, c0, titulo); t.font = Font(name=F, size=12, bold=True, color='FFFFFF'); t.fill = relleno(color)
        for k in range(1, 5): ws.cell(5, c0 + k).fill = relleno(color)
        ws.cell(6, c0, 'Total (L)').font = Font(name=F, size=9, color=GRIS)
        tot = ws.cell(6, c0 + 1, f'=SUM({L(4)}{PRI}:{L(4)}{ULT})'); tot.font = Font(name=F, size=14, bold=True, color=VINO); tot.number_format = '#,##0.00'; tot.alignment = Alignment(horizontal='left')
        for k, (n, w, nf) in enumerate(cols):
            c = ws.cell(8, c0 + k, n); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(MAGENTA if titulo == 'VENTAS' else VINO)
            c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='left' if n == 'Producto' else 'center'); c.border = borde
            ws.column_dimensions[L(k)].width = w
        for r, fila in enumerate(filas):
            for k, v in enumerate(fila): ws.cell(PRI + r, c0 + k, v)
        for f in range(PRI, ULT + 1):
            ws.cell(f, c0 + 4, f'=IF(OR({L(2)}{f}="",{L(3)}{f}=""),"",{L(2)}{f}*{L(3)}{f})')
            for k, (n, _, nf) in enumerate(cols):
                c = ws.cell(f, c0 + k); c.font = Font(name=F, size=10, color=TINTA); c.border = borde
                if nf: c.number_format = nf
                if k == 4: c.fill = relleno(ROSA)
                else: c.fill = relleno(AMARILLO); c.protection = ABIERTA
                if n != 'Producto': c.alignment = Alignment(horizontal='center')
        num.add(f'{L(2)}{PRI}:{L(3)}{ULT}'); fecha.add(f'{L(0)}{PRI}:{L(0)}{ULT}'); lista.add(f'{L(1)}{PRI}:{L(1)}{ULT}')
    # Numeración de productos (columnas ocultas)
    for f in range(PRI, ULT + 1):
        ws.cell(f, 13, f'=IF(TRIM(B{f})="","",IF(COUNTIF($B${PRI}:B{f},B{f})=1,MAX($M$8:M{f - 1})+1,""))')
        ws.cell(f, 14, f'=IF(TRIM(H{f})="","",IF(AND(COUNTIF($H${PRI}:H{f},H{f})=1,COUNTIF($B${PRI}:$B${ULT},H{f})=0),MAX(10000,$N$8:N{f - 1})+1,""))')
    ws['M7'] = f'=MAX(M{PRI}:M{ULT})'; ws['M8'] = 'n'; ws['N8'] = 'n'
    for c in ('M', 'N'): ws.column_dimensions[c].hidden = True
    ws.column_dimensions['F'].width = 3
    ws.row_dimensions[8].height = 30
    ws.freeze_panes = f'A{PRI}'
    return PRI, ULT


def inventario():
    from datetime import date
    wb = Workbook(); ws = wb.active; ws.title = 'Productos'
    N_P, N_M = 200, 1000
    PRI = 9; ULT = PRI + N_P - 1
    d = lambda dd: date(2026, 11, dd)
    # Lo que ya había al empezar se anota como compra del primer día
    compras = [(d(1), 'Arroz (libra)', 40, 12), (d(1), 'Frijoles rojos (libra)', 30, 20), (d(1), 'Aceite 750 ml', 12, 48), (d(1), 'Refresco 3 litros', 18, 42), (d(1), 'Jabón de lavar', 25, 14),
               (d(3), 'Arroz (libra)', 50, 12), (d(3), 'Frijoles rojos (libra)', 20, 20), (d(10), 'Aceite 750 ml', 12, 48), (d(10), 'Refresco 3 litros', 24, 42)]
    ventas = [(d(4), 'Arroz (libra)', 30, 15), (d(4), 'Frijoles rojos (libra)', 20, 25), (d(5), 'Jabón de lavar', 9, 18), (d(11), 'Aceite 750 ml', 24, 58),
              (d(12), 'Refresco 3 litros', 20, 50), (d(15), 'Arroz (libra)', 32, 15), (d(16), 'Frijoles rojos (libra)', 24, 25)]
    M1, M2 = movimientos(wb, compras, ventas, N_M)
    R = REF_MOV
    cB, cC, cE = (f"{R}!${c}${M1}:${c}${M2}" for c in 'BCE')
    vH, vI, vK = (f"{R}!${c}${M1}:${c}${M2}" for c in 'HIK')
    cols = [('Producto', 30, None), ('Comprado', 12, '#,##0.##'), ('Vendido', 12, '#,##0.##'), ('Existencia', 12, '#,##0.##'),
            ('Costo promedio (L)', 14, '#,##0.00'), ('Precio promedio (L)', 14, '#,##0.00'), ('Valor al costo (L)', 15, '#,##0.00'), ('Estado', 22, None)]
    encabezado(ws, 'Plantilla de inventario', 'Se llena sola con lo que anotas en «Compras y ventas». Solo la casilla amarilla se puede cambiar.', len(cols))
    ws['A5'] = 'Productos'; ws['A6'] = f'=COUNTIF(A{PRI}:A{ULT},"?*")'
    ws['C5'] = 'Valor del inventario al costo (L)'; ws['C6'] = f'=SUM(G{PRI}:G{ULT})'
    ws['F5'] = 'Por comprar o agotados'; ws['F6'] = f'=COUNTIF(H{PRI}:H{ULT},"Comprar")+COUNTIF(H{PRI}:H{ULT},"Agotado")'
    for c, nf in (('A', '0'), ('C', '#,##0.00'), ('F', '0')):
        ws[c + '5'].font = Font(name=F, size=9, color=GRIS)
        ws[c + '6'].font = Font(name=F, size=14, bold=True, color=VINO); ws[c + '6'].number_format = nf; ws[c + '6'].alignment = Alignment(horizontal='left')
    # La única celda que se llena en esta hoja: con cuántas unidades avisar
    # H6 es la única celda amarilla de esta hoja
    ws['H5'] = 'Avísame cuando queden'; ws['H5'].font = Font(name=F, size=9, bold=True, color=VINO)
    ws['H6'] = 10; ws['H6'].font = Font(name=F, size=14, bold=True, color=TINTA); ws['H6'].alignment = Alignment(horizontal='center')
    ws['H6'].border = Border(*(Side(style='medium', color=ORO),) * 4); ws['H6'].fill = relleno(AMARILLO); ws['H6'].protection = ABIERTA
    dv = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1='0', showErrorMessage=True, errorTitle='Solo números', error='Escribe cuántas unidades, por ejemplo 10.')
    ws.add_data_validation(dv); dv.add('H6')
    tabla(ws, 8, cols, set(range(1, 9)), N_P)
    for f in range(PRI, ULT + 1):
        k = f - PRI + 1
        ws.cell(f, 1, f"=IF({k}<={R}!$M$7,IFERROR(INDEX({cB},MATCH({k},{R}!$M${M1}:$M${M2},0)),\"\"),IFERROR(INDEX({vH},MATCH(10000+{k}-{R}!$M$7,{R}!$N${M1}:$N${M2},0)),\"\"))")
        ws.cell(f, 2, f'=IF(A{f}="","",SUMIF({cB},A{f},{cC}))')
        ws.cell(f, 3, f'=IF(A{f}="","",SUMIF({vH},A{f},{vI}))')
        ws.cell(f, 4, f'=IF(A{f}="","",B{f}-C{f})')
        ws.cell(f, 5, f'=IF(OR(A{f}="",B{f}=0),"",SUMIF({cB},A{f},{cE})/B{f})')
        ws.cell(f, 6, f'=IF(OR(A{f}="",C{f}=0),"",SUMIF({vH},A{f},{vK})/C{f})')
        ws.cell(f, 7, f'=IF(OR(A{f}="",E{f}=""),"",MAX(D{f},0)*E{f})')
        ws.cell(f, 8, f'=IF(A{f}="","",IF(D{f}<0,"Revisar",IF(D{f}=0,"Agotado",IF(D{f}<=$H$6,"Comprar","Bien"))))')
        ws.cell(f, 1).font = Font(name=F, size=10, bold=True, color=TINTA)
        ws.cell(f, 4).font = Font(name=F, size=10, bold=True, color=TINTA)
    ws.conditional_formatting.add(f'H{PRI}:H{ULT}', FormulaRule(formula=[f'OR($H{PRI}="Agotado",$H{PRI}="Revisar")'], font=Font(name=F, bold=True, color='B00020')))
    ws.conditional_formatting.add(f'H{PRI}:H{ULT}', FormulaRule(formula=[f'$H{PRI}="Comprar"'], font=Font(name=F, bold=True, color='9A6700')))
    wb[HOJA_MOV].sheet_properties.tabColor = MAGENTA; ws.sheet_properties.tabColor = VINO
    hoja_ayuda(wb, 'Plantilla de inventario', [
        ('Todo se anota en la hoja «Compras y ventas»', 'Compras a la izquierda y ventas a la derecha. Una fila por cada compra o venta; el mismo producto se puede repetir las veces que quieras.'),
        ('Empieza con lo que ya tienes', 'El primer día, anota como compra lo que hay en tu estante: producto, cantidad y lo que te costó.'),
        ('Escribe el producto siempre igual', 'La primera vez lo escribes; después lo eliges de la lista. Si lo escribes distinto («Arroz» y «arroz libra»), salen como dos productos.'),
        ('La hoja «Productos» se llena sola', 'Ahí ves cada producto una sola vez con lo comprado, lo vendido, la existencia, su costo y precio promedio y el valor de tu inventario. No escribas en ella.'),
        ('Elige cuándo te avisa', 'Arriba de «Productos», en «Avísame cuando queden», escribe un número. Cuando la existencia llega ahí, el estado dice «Comprar»; en cero dice «Agotado». «Revisar» quiere decir que se vendió más de lo comprado: falta anotar una compra.'),
        ('Borra los ejemplos', 'Las compras y ventas que trae son de ejemplo. Selecciona las celdas amarillas con datos y bórralas antes de empezar; la hoja «Productos» se vacía sola.'),
    ], ('Cómo llevar el inventario de tu negocio', '/guias/como-llevar-el-inventario-de-tu-negocio/'), 'plantilla')
    wb.move_sheet('Cómo usarla', offset=-(len(wb.sheetnames) - 1))
    wb.move_sheet(HOJA_MOV, offset=-1)  # orden: Cómo usarla · Compras y ventas · Productos
    for h in wb.worksheets:
        h.page_setup.fitToWidth = 1; h.page_setup.fitToHeight = 0; h.sheet_properties.pageSetUpPr.fitToPage = True
        if h.title != 'Cómo usarla': h.page_setup.orientation = 'landscape'; h.print_title_rows = '8:8'
    wb[HOJA_MOV].print_area = 'A1:K1008'
    for h in wb.worksheets: proteger(h)
    wb.active = 1
    wb.properties.creator = 'Molina Soluciones Digitales'; wb.properties.title = 'Plantilla de inventario'
    wb.save(SALIDA / 'plantilla-de-inventario.xlsx')


if __name__ == '__main__':
    import sys
    sys.modules.setdefault('plantillas', sys.modules['__main__'])  # las otras plantillas usan las funciones de este archivo
    from otras_plantillas import cierre, arqueo, credito, precios, gastos, pedidos
    SALIDA.mkdir(exist_ok=True)
    for fn in (inventario, cierre, arqueo, credito, precios, gastos, pedidos):
        fn()
    print('listo')
