export default function NumberGrid({ compras, isAdmin, onCellClick, selectedNums = [] }) {
  // Build map: numero -> comprador
  const numMap = {};
  compras.forEach(c => {
    c.numeros.forEach(n => {
      numMap[n] = { comprador: c.comprador, compraId: c._id };
    });
  });

  return (
    <div className="number-grid">
      {Array.from({ length: 41 }, (_, i) => i + 1).map(num => {
        const info = numMap[num];
        const vendido = !!info;
        const seleccionado = selectedNums.includes(num);

        let cellClass = 'number-cell ';
        if (vendido) cellClass += 'vendido';
        else if (seleccionado) cellClass += 'seleccionado';
        else cellClass += 'libre';

        return (
          <div
            key={num}
            id={`num-${num}`}
            className={cellClass}
            onClick={() => isAdmin && !vendido && onCellClick && onCellClick(num)}
            title={vendido ? `${info.comprador}` : `Número ${num} — libre`}
          >
            <span className="num-label">{String(num).padStart(2, '0')}</span>
            {vendido && (
              <span className="num-owner">{info.comprador}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
