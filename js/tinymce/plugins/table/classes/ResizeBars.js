/**
 * ResizeBars.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/**
 * This class handles table cell selection by faking it using a css class that gets applied
 * to cells when dragging the mouse from one cell to another.
 *
 * @class tinymce.tableplugin.ResizeBars
 * @private
 */
define("tinymce/tableplugin/ResizeBars", [
	"tinymce/util/Tools"
], function(Tools) {
	return function(editor) {
		var RESIZE_BAR_CLASS = 'mce-resize-bar',
			RESIZE_BAR_ROW_CLASS = 'mce-resize-bar-row',
			RESIZE_BAR_ROW_CURSOR_STYLE = 'row-resize',
			RESIZE_BAR_ROW_DATA_ATTRIBUTE = 'data-row',
			RESIZE_BAR_ROW_DATA_INITIAL_TOP_ATTRIBUTE = 'data-initial-top',
			RESIZE_BAR_COL_CLASS = 'mce-resize-bar-col',
			RESIZE_BAR_COL_CURSOR_STYLE = 'col-resize',
			RESIZE_BAR_COL_DATA_ATTRIBUTE = 'data-col',
			RESIZE_BAR_COL_DATA_INITIAL_LEFT_ATTRIBUTE = 'data-initial-left',
			RESIZE_BAR_THICKNESS = 4,
			RESIZE_MINIMUM_WIDTH = 10,
			RESIZE_MINIMUM_HEIGHT = 10;

		function getTopEdge(index, row) {
			return {
				index: index,
				y: editor.dom.getPos(row).y
			};
		}

		function getBottomEdge(index, row) {
			return {
				index: index,
				y: editor.dom.getPos(row).y + row.offsetHeight
			};
		}

		function getLeftEdge(index, cell) {
			return {
				index: index,
				x: editor.dom.getPos(cell).x
			};
		}

		function getRightEdge(index, cell) {
			return {
				index: index,
				x: editor.dom.getPos(cell).x + cell.offsetWidth
			};
		}

		function isRtl() {
			var dir = editor.getBody().dir;
			return dir === 'rtl';
		}

		function isInline() {
			return editor.inline;
		}

		function getBody() {
			return isInline ? editor.getBody().ownerDocument.body : editor.getBody();
		}

		function getInnerEdge(index, cell) {
			return isRtl() ? getRightEdge(index, cell) : getLeftEdge(index, cell);
		}

		function getOuterEdge(index, cell) {
			return isRtl() ? getLeftEdge(index, cell) : getRightEdge(index, cell);
		}

		function findPositions(getInner, getOuter, thingsToMeasure) {
			var tablePositions = [];

			//Skip the first item in the array = no left (LTR), right (RTL) or top bars
			for (var i = 1; i < thingsToMeasure.length; i++) {
				//Get the element from the details
				var item = thingsToMeasure[i].element;
				//We need to zero index this again
				tablePositions.push(getInner(i - 1, item));
			}

			var lastTableLineToMake = thingsToMeasure[thingsToMeasure.length - 1];
			tablePositions.push(getOuter(thingsToMeasure.length - 1, lastTableLineToMake.element));

			return tablePositions;
		}

		function clearBars() {
			var bars = editor.dom.select('.' + RESIZE_BAR_CLASS, getBody());
			Tools.each(bars, function(bar) {
				editor.dom.remove(bar);
			});
		}

		function refreshBars(tableElement) {
			clearBars();
			drawBars(tableElement);
		}

		function generateBar(classToAdd, cursor, left, top, height, width, indexAttr, index) {
			var bar = {
				'data-mce-bogus': 'all',
				'class': RESIZE_BAR_CLASS + ' ' + classToAdd,
				unselectable: true,
				style: 'cursor: ' + cursor + '; ' +
					'margin: 0; ' +
					'padding: 0; ' +
					'position: absolute; ' +
					'left: ' + left + 'px; ' +
					'top: ' + top + 'px; ' +
					'height: ' + height + 'px; ' +
					'width: ' + width + 'px; '/* + //Useful if debugging
					'background-color: blue; ' +
					'opacity: 0.5'*/
			};

			bar[indexAttr] = index;

			return bar;
		}

		function drawRows(rowPositions, tableWidth, tablePosition) {
			Tools.each(rowPositions, function(rowPosition) {
				var left = tablePosition.x,
					top = rowPosition.y - RESIZE_BAR_THICKNESS / 2,
					height = RESIZE_BAR_THICKNESS,
					width = tableWidth;

				editor.dom.add(getBody(), 'div',
					generateBar(RESIZE_BAR_ROW_CLASS, RESIZE_BAR_ROW_CURSOR_STYLE,
						left, top, height, width, RESIZE_BAR_ROW_DATA_ATTRIBUTE, rowPosition.index));
			});
		}

		function drawCols(cellPositions, tableHeight, tablePosition) {
			Tools.each(cellPositions, function(cellPosition) {
				var left = cellPosition.x - RESIZE_BAR_THICKNESS / 2,
					top = tablePosition.y,
					height = tableHeight,
					width = RESIZE_BAR_THICKNESS;

				editor.dom.add(getBody(), 'div',
					generateBar(RESIZE_BAR_COL_CLASS, RESIZE_BAR_COL_CURSOR_STYLE,
						left, top, height, width, RESIZE_BAR_COL_DATA_ATTRIBUTE, cellPosition.index));
			});
		}

		function getTableDetails(table) {
			return Tools.map(table.rows, function(row) {

				var cells = Tools.map(row.cells, function(cell) {

					var rowspan = cell.hasAttribute('rowspan') ? parseInt(cell.getAttribute('rowspan'), 10) : 1;
					var colspan = cell.hasAttribute('colspan') ? parseInt(cell.getAttribute('colspan'), 10) : 1;

					return {
						element: cell,
						rowspan: rowspan,
						colspan: colspan
					};
				});

				return {
					element: row,
					cells: cells
				};

			});

		}

		function getJengaGrid(tableDetails) {
			function key(rowIndex, colIndex) {
				return rowIndex + ',' + colIndex;
			}

			function getAt(rowIndex, colIndex) {
				return access[key(rowIndex, colIndex)];
			}

			function getAllCells() {
				var allCells = [];
				Tools.each(rows, function(row) {
					allCells = allCells.concat(row.cells);
				});
				return allCells;
			}

			function getAllRows() {
				return rows;
			}

			var access = {};
			var rows = [];

			var maxRows = 0;
			var maxCols = 0;

			Tools.each(tableDetails, function(row, rowIndex) {
				var currentRow = [];

				Tools.each(row.cells, function(cell) {

					var start = 0;

					while (access[key(rowIndex, start)] !== undefined) {
						start++;
					}

					var current = {
						element: cell.element,
						colspan: cell.colspan,
						rowspan: cell.rowspan,
						rowIndex: rowIndex,
						colIndex: start
					};

					for (var i = 0; i < cell.colspan; i++) {
						for (var j = 0; j < cell.rowspan; j++) {
							var cr = rowIndex + j;
							var cc = start + i;
							access[key(cr, cc)] = current;
							maxRows = Math.max(maxRows, cr + 1);
							maxCols = Math.max(maxCols, cc + 1);
						}
					}

					currentRow.push(current);
				});

				rows.push({
					element: row.element,
					cells: currentRow
				});
			});

			return {
				grid: {
					maxRows: maxRows,
					maxCols: maxCols
				},
				getAt: getAt,
				getAllCells: getAllCells,
				getAllRows: getAllRows
			};
		}

		function range(start, end) {
			var r = [];

			for (var i = start; i < end; i++) {
				r.push(i);
			}

			return r;
		}

		function decide(getBlock, isSingle, getFallback) {
			var inBlock = getBlock();
			var singleInBlock;

			for (var i = 0; i < inBlock.length; i++) {
				if (isSingle(inBlock[i])) {
					singleInBlock = inBlock[i];
				}
			}
			//Is this necessary?  inblock[0] and getfallback should be the same thing?
			singleInBlock = singleInBlock ? singleInBlock : inBlock[0];
			return singleInBlock ? singleInBlock : getFallback();
		}

		function getColumnBlocks(jenga) {
			var cols = range(0, jenga.grid.maxCols);
			var rows = range(0, jenga.grid.maxRows);

			return Tools.map(cols, function(col) {

				function getBlock() {
					for (var i = 0; i < rows.length; i++) {
						var detail = jenga.getAt(i, col);
						if (detail.colIndex === col) {
							return [detail];
						}
					}
				}

				function isSingle(detail) {
					return detail.colspan === 1;
				}

				function getFallback() {
					return jenga.getAt(0, col);
				}

				return decide(getBlock, isSingle, getFallback);

			});
		}

		function getRowBlocks(jenga) {

			var cols = range(0, jenga.grid.maxCols);
			var rows = range(0, jenga.grid.maxRows);

			return Tools.map(rows, function(row) {

				function getBlock() {
					for (var i = 0; i < cols.length; i++) {
						var detail = jenga.getAt(row, i);
						if (detail.rowIndex === row) {
							return [detail];
						}
					}
				}

				function isSingle(detail) {
					return detail.rowspan === 1;
				}

				function getFallback() {
					jenga.getAt(row, 0);
				}

				return decide(getBlock, isSingle, getFallback);
			});
		}

		function drawBars(table) {
			var tableDetails = getTableDetails(table);
			var jenga = getJengaGrid(tableDetails);
			var rows = getRowBlocks(jenga);
			var cols = getColumnBlocks(jenga);

			var tablePosition = editor.dom.getPos(table);
			var rowPositions = rows.length > 0 ? findPositions(getTopEdge, getBottomEdge, rows) : [];
			//RTL/LTR Below
			var colPositions = cols.length > 0 ? findPositions(getInnerEdge, getOuterEdge, cols) : [];
			//RTL/LTR Above

			drawRows(rowPositions, table.offsetWidth, tablePosition);
			drawCols(colPositions, table.offsetHeight, tablePosition);
		}

		function deduceSize(deducables, index) {
			if (index < 0 || index >= deducables.length - 1) {
				return "";
			}

			var current = deducables[index];

			if (current) {
				current = {
					value: current,
					delta: 0
				};
			} else {
				var reversedUpToIndex = deducables.slice(0, index).reverse();
				for (var i = 0; i < reversedUpToIndex.length; i++) {
					if (reversedUpToIndex[i]) {
						current = {
							value: reversedUpToIndex[i],
							delta: i + 1
						};
					}
				}
			}

			var next = deducables[index + 1];

			if (next) {
				next = {
					value: next,
					delta: 1
				};
			} else {
				var rest = deducables.slice(index + 1);
				for (var j = 0; j < rest.length; j++) {
					if (rest[j]) {
						next = {
							value: rest[j],
							delta: j + 1
						};
					}
				}
			}

			var extras = next.delta - current.delta;
			return Math.abs(next.value - current.value) / extras;
		}

		function getPixelWidths(jenga) {

			function convertFromPercent(element, cellWidth) {
				var table = editor.dom.getParent(element, 'table');
				var tableTotal = table.offsetWidth;
				return Math.floor((cellWidth / 100) * tableTotal);
			}

			function getPixelWidth(element) {
				var widthString = editor.dom.getStyle(element, 'width');
				if (!widthString) {
					widthString = editor.dom.getAttrib(element, 'width');
				}
				var widthNumber = parseInt(widthString, 10);
				return widthString.indexOf('%', widthString.length - 1) > 0 ?
					convertFromPercent(element, widthNumber) : widthNumber;
			}

			var cols = getColumnBlocks(jenga);

			var backups = Tools.map(cols, function(col) {
				return getInnerEdge(col.colIndex, col.element).x;
			});

			var widths = [];

			for (var i = 0; i < cols.length; i++) {
				var span = cols[i].element.hasAttribute('colspan') ? parseInt(cols[i].element.getAttribute('colspan'), 10) : 1;
				//Deduce if the column has colspan of more than 1
				var width = span > 1 ? deduceSize(backups, i) : getPixelWidth(cols[i].element);
				//If everything's failed and we still don't have a width
				width = width ? width : RESIZE_MINIMUM_WIDTH;
				widths.push(width);
			}

			return widths;
		}

		function getPixelHeights(jenga) {

			function convertFromPercent(element, cellWidth) {
				var table = editor.dom.getParent(element, 'table');
				var tableTotal = table.offsetHeight;
				return Math.floor((cellWidth / 100) * tableTotal);
			}

			function getPixelHeight(element) {
				var widthString = editor.dom.getStyle(element, 'height');
				if (!widthString) {
					widthString = editor.dom.getAttrib(element, 'height');
				}
				var widthNumber = parseInt(widthString, 10);
				return widthString.indexOf('%', widthString.length - 1) > 0 ?
					convertFromPercent(element, widthNumber) : widthNumber;
			}

			var rows = getRowBlocks(jenga);

			var backups = Tools.map(rows, function(row) {
				return getTopEdge(row.rowIndex, row.element).y;
			});

			var heights = [];

			for (var i = 0; i < rows.length; i++) {
				var span = rows[i].element.hasAttribute('rowspan') ? parseInt(rows[i].element.getAttribute('rowspan'), 10) : 1;

				var height = span > 1 ? deduceSize(backups, i) : getPixelHeight(rows[i].element);

				height = height ? height : RESIZE_MINIMUM_HEIGHT;
				heights.push(height);
			}

			return heights;
		}

		function determineDeltas(sizes, column, step, min) {

			var result = sizes.slice(0);

			function generateZeros(array) {
				return Tools.map(array, function() {
					return 0;
				});
			}

			function onLeftOrMiddle(index, next) {

				var startZeros = generateZeros(result.slice(0, index));
				var endZeros = generateZeros(result.slice(next + 1));
				var deltas;

				if (step >= 0) {
					var newNext = Math.max(min, result[next] - step);
					deltas = startZeros.concat([step, newNext - result[next]]).concat(endZeros);
				} else {
					var newThis = Math.max(min, result[index] + step);
					var diffx = result[index] - newThis;
					deltas = startZeros.concat([newThis - result[index], diffx]).concat(endZeros);
				}

				return deltas;
			}

			function onRight(previous, index) {
				var startZeros = generateZeros(result.slice(0, index));
				var deltas;

				if (step >= 0) {
					deltas = startZeros.concat([step]);
				} else {
					var size = Math.max(min, result[index] + step);
					deltas = startZeros.concat([size - result[index]]);
				}

				return deltas;

			}

			var deltas;

			if (sizes.length === 0) { //No Columns
				deltas = [];
			} else if (sizes.length === 1) { //One Column
				var newNext = Math.max(min, result[0] + step);
				deltas = [newNext - result[0]];
			} else if (column === 0) { //Left Column
				deltas = onLeftOrMiddle(0, 1);
			} else if (column > 0 && column < sizes.length - 1) { //Middle Column
				deltas = onLeftOrMiddle(column, column + 1);
			} else if (column === sizes.length - 1) { // Right Column
				deltas = onRight(column - 1, column);
			} else {
				deltas = [];
			}

			return deltas;
		}

		function total(start, end, measures) {
			var r = 0;
			for (var i = start; i < end; i++) {
				r += measures[i];
			}
			return r;
		}

		function recalculateWidths(jenga, widths) {
			var allCells = jenga.getAllCells();
			return Tools.map(allCells, function(cell) {
				var width = total(cell.colIndex, cell.colIndex + cell.colspan, widths);
				return {
					element: cell.element,
					width: width,
					colspan: cell.colspan
				};
			});
		}

		function recalculateCellHeights(jenga, heights) {
			var allCells = jenga.getAllCells();
			return Tools.map(allCells, function(cell) {
				var height = total(cell.rowIndex, cell.rowIndex + cell.rowspan, heights);
				return {
					element: cell.element,
					height: height,
					rowspan: cell.rowspan
				};
			});
		}

		function recalculateRowHeights(jenga, heights) {
			var allRows = jenga.getAllRows();
			return Tools.map(allRows, function(row, i) {
				return {
					element: row.element,
					height: heights[i]
				};
			});
		}

		function adjustWidth(table, delta, index) {
			var tableDetails = getTableDetails(table);
			var jenga = getJengaGrid(tableDetails);

			var widths = getPixelWidths(jenga);
			var deltas = determineDeltas(widths, index, delta, RESIZE_MINIMUM_WIDTH);
			var newWidths = [], newTotalWidth = 0;

			for (var i = 0; i < deltas.length; i++) {
				newWidths.push(deltas[i] + widths[i]);
				newTotalWidth += newWidths[i];
			}

			var newSizes = recalculateWidths(jenga, newWidths);

			Tools.each(newSizes, function(cell) {
				editor.dom.setStyle(cell.element, 'width', cell.width + 'px');
				editor.dom.setAttrib(cell.element, 'width', null);
			});

			editor.dom.setStyle(table, 'width', newTotalWidth + 'px');
			editor.dom.setAttrib(table, 'width', null);

		}

		function adjustHeight(table, delta, index) {
			var tableDetails = getTableDetails(table);
			var jenga = getJengaGrid(tableDetails);

			var heights = getPixelHeights(jenga);

			var newHeights = [], newTotalHeight = 0;

			for (var i = 0; i < heights.length; i++) {
				newHeights.push(i === index ? delta + heights[i] : heights[i]);
				newTotalHeight += newTotalHeight[i];
			}

			var newCellSizes = recalculateCellHeights(jenga, newHeights);
			var newRowSizes = recalculateRowHeights(jenga, newHeights);

			Tools.each(newRowSizes, function(row) {
				editor.dom.setStyle(row.element, 'height', row.height + 'px');
				editor.dom.setAttrib(row.element, 'height', null);
			});

			Tools.each(newCellSizes, function(cell) {
				editor.dom.setStyle(cell.element, 'height', cell.height + 'px');
				editor.dom.setAttrib(cell.element, 'height', null);
			});

			editor.dom.setStyle(table, 'height', newTotalHeight + 'px');
			editor.dom.setAttrib(table, 'height', null);
		}

		var delayDrop;

		function scheduleDelayedDropEvent() {
			delayDrop = setTimeout(function() {
				drop();
			}, 200);
		}

		function cancelDelayedDropEvent() {
			clearTimeout(delayDrop);
		}

		function getBlockerElement() {
			var blocker = document.createElement('div');

			blocker.setAttribute('style', 'margin: 0; ' +
						'padding: 0; ' +
						'position: fixed; ' +
						'left: 0px; ' +
						'top: 0px; ' +
						'height: 100%; ' +
						'width: 100%;');
			blocker.setAttribute('data-mce-bogus', 'all');

			return blocker;
		}

		var dragging;

		function bindBlockerEvents(blocker, dragHandler) {
			editor.dom.bind(blocker, 'mouseup', function() {
				drop();
			});

			editor.dom.bind(blocker, 'mousemove', function(e) {
				cancelDelayedDropEvent();

				if (dragging) {
					dragHandler(e);
				}
			});

			editor.dom.bind(blocker, 'mouseout', function() {
				scheduleDelayedDropEvent();
			});

		}

		var blockerElement, dragBar;

		function drop() {
			editor.dom.remove(blockerElement);

			if (dragging) {
				dragging = false;

				var index, delta;

				if (isCol(dragBar)) {
					var initialLeft = parseInt(editor.dom.getAttrib(dragBar, RESIZE_BAR_COL_DATA_INITIAL_LEFT_ATTRIBUTE), 10);
					var newLeft = editor.dom.getPos(dragBar).x;
					index = parseInt(editor.dom.getAttrib(dragBar, RESIZE_BAR_COL_DATA_ATTRIBUTE), 10);
					delta = isRtl() ? initialLeft - newLeft : newLeft - initialLeft;
					adjustWidth(hoverTable, delta, index);
				} else if (isRow(dragBar)) {
					var initialTop = parseInt(editor.dom.getAttrib(dragBar, RESIZE_BAR_ROW_DATA_INITIAL_TOP_ATTRIBUTE), 10);
					var newTop = editor.dom.getPos(dragBar).y;
					index = parseInt(editor.dom.getAttrib(dragBar, RESIZE_BAR_ROW_DATA_ATTRIBUTE), 10);
					delta = newTop - initialTop;
					adjustHeight(hoverTable, delta, index);
				}
				refreshBars(hoverTable);
			}
		}

		function setupBaseDrag(bar, dragHandler) {
			blockerElement = blockerElement ? blockerElement : getBlockerElement();
			dragging = true;
			dragBar = bar;
			bindBlockerEvents(blockerElement, dragHandler);
			editor.dom.add(getBody(), blockerElement);
		}

		function isCol(target) {
			return editor.dom.hasClass(target, RESIZE_BAR_COL_CLASS);
		}

		function isRow(target) {
			return editor.dom.hasClass(target, RESIZE_BAR_ROW_CLASS);
		}

		var lastX;

		function colDragHandler(event) {
			lastX = lastX !== undefined ? lastX : event.clientX; //we need a firstX
			var deltaX = event.clientX - lastX;
			lastX = event.clientX;
			var oldLeft = editor.dom.getPos(dragBar).x;
			editor.dom.setStyle(dragBar, 'left', oldLeft + deltaX + 'px');
		}

		var lastY;

		function rowDragHandler(event) {
			lastY = lastY !== undefined ? lastY : event.clientY;
			var deltaY = event.clientY - lastY;
			lastY = event.clientY;
			var oldTop = editor.dom.getPos(dragBar).y;
			editor.dom.setStyle(dragBar, 'top', oldTop + deltaY + 'px');
		}

		function setupColDrag(bar) {
			lastX = undefined;
			setupBaseDrag(bar, colDragHandler);
		}

		function setupRowDrag(bar) {
			lastY = undefined;
			setupBaseDrag(bar, rowDragHandler);
		}

		editor.on('init', function() {
			//Needs to be like this for inline mode, editor.on does not bind to elements in the document body otherwise
			editor.dom.bind(getBody(), 'mousedown', function(e) {
				var target = e.target;

				if (isCol(target)) {
					var initialLeft = editor.dom.getPos(target).x;
					editor.dom.setAttrib(target, RESIZE_BAR_COL_DATA_INITIAL_LEFT_ATTRIBUTE, initialLeft);
					setupColDrag(target);
				} else if (isRow(target)) {
					var initialTop = editor.dom.getPos(target).y;
					editor.dom.setAttrib(target, RESIZE_BAR_ROW_DATA_INITIAL_TOP_ATTRIBUTE, initialTop);
					setupRowDrag(target);
				}
			});
		});

		var hoverTable;

		editor.on('mouseover', function(e) {
			if (!dragging) {
				var tableElement = editor.dom.getParent(e.target, 'table');

				if (e.target.nodeName === 'table' || tableElement) {
					hoverTable = tableElement;
					refreshBars(tableElement);
				}
			}
		});

		return {
			clear: clearBars
		};
	};
});