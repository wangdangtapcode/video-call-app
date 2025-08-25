import React, { useState, useEffect, useRef } from "react";
import { Edit2, Trash2, Undo, ZoomIn, ZoomOut, RotateCcw, Type } from "lucide-react";

const ImageEditor = ({
  imageData = "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='300' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24' fill='%23374151'%3ESample Image%3C/text%3E%3C/svg%3E",
  onSave = () => {},
  onCancel = () => {},
}) => {
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(5);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [history, setHistory] = useState([]); // Lưu { canvasData, drawings }
  const [drawings, setDrawings] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      const maxWidth = 1200;
      const maxHeight = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      setCanvasWidth(width);
      setCanvasHeight(height);
    };
    img.src = imageData;
  }, [imageData]);

  useEffect(() => {
    if (image && canvasRef.current && backgroundCanvasRef.current) {
      drawBackground();
      redrawCanvas();
      // Lưu trạng thái ban đầu vào history
      if (history.length === 0) {
        const canvas = canvasRef.current;
        const canvasData = canvas.toDataURL();
        setHistory([{ canvasData, drawings: [] }]);
      }
    }
  }, [image, canvasWidth, canvasHeight, imageScale, imageRotation, drawings]);

  const drawBackground = () => {
    const bgCanvas = backgroundCanvasRef.current;
    const ctx = bgCanvas.getContext("2d");

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (image) {
      ctx.save();
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.scale(imageScale, imageScale);
      ctx.drawImage(image, -canvasWidth / 2, -canvasHeight / 2, canvasWidth, canvasHeight);
      ctx.restore();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawings.forEach((drawing) => {
      ctx.save();
      ctx.lineWidth = drawing.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (drawing.tool === "pen" || drawing.tool === "eraser") {
        ctx.beginPath();
        ctx.strokeStyle = drawing.color;
        ctx.globalCompositeOperation = drawing.tool === "eraser" ? "destination-out" : "source-over";
        for (let i = 0; i < drawing.points.length - 2; i += 2) {
          ctx.moveTo(drawing.points[i], drawing.points[i + 1]);
          ctx.lineTo(drawing.points[i + 2], drawing.points[i + 3]);
        }
        ctx.stroke();
      } else if (drawing.tool === "rect") {
        ctx.strokeStyle = drawing.color;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeRect(drawing.x, drawing.y, drawing.width, drawing.height);
      } else if (drawing.tool === "circle") {
        ctx.beginPath();
        ctx.strokeStyle = drawing.color;
        ctx.globalCompositeOperation = "source-over";
        ctx.arc(
          drawing.x + drawing.width / 2,
          drawing.y + drawing.height / 2,
          Math.max(Math.abs(drawing.width), Math.abs(drawing.height)) / 2,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else if (drawing.tool === "text") {
        ctx.font = `${drawing.fontSize}px Arial`;
        ctx.fillStyle = drawing.color;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillText(drawing.text, drawing.x, drawing.y);
      }

      ctx.restore();
    });
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const canvasData = canvas.toDataURL();
      setHistory((prev) => [...prev, { canvasData, drawings }].slice(-10)); // Lưu cả canvas và drawings
    }
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    if (showTextInput) return;

    if (tool === "text") {
      const pos = getMousePos(e);
      setTextPosition(pos);
      setShowTextInput(true);
      setTextInput("");
      return;
    }

    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPoint(pos);
    setStartPoint(pos);

    if (tool === "pen" || tool === "eraser") {
      setDrawings([
        ...drawings,
        {
          tool,
          points: [pos.x, pos.y],
          color: tool === "eraser" ? "#ffffff" : color,
          lineWidth,
        },
      ]);
    } else if (tool === "rect" || tool === "circle") {
      setDrawings([
        ...drawings,
        {
          tool,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          color,
          lineWidth,
        },
      ]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const lastDrawing = drawings[drawings.length - 1];

    if (tool === "pen" || tool === "eraser") {
      lastDrawing.points = [...lastDrawing.points, pos.x, pos.y];
      setDrawings([...drawings.slice(0, -1), lastDrawing]);
    } else if (tool === "rect" || tool === "circle") {
      lastDrawing.width = pos.x - lastDrawing.x;
      lastDrawing.height = pos.y - lastDrawing.y;
      setDrawings([...drawings.slice(0, -1), lastDrawing]);
    }

    setLastPoint(pos);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setDrawings([
        ...drawings,
        {
          tool: "text",
          x: textPosition.x,
          y: textPosition.y,
          text: textInput,
          color,
          fontSize: Math.max(16, lineWidth * 3),
        },
      ]);
      saveToHistory();
    }
    setShowTextInput(false);
    setTextInput("");
  };

  const handleTextKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (textInput.trim()) {
        handleTextSubmit();
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setShowTextInput(false);
      setTextInput("");
    }
  };

  const handleUndo = () => {
    if (history.length > 1) { // Giữ lại trạng thái ban đầu
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const previousState = history[history.length - 2]; // Lấy trạng thái trước đó

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, 0, 0);
        setDrawings(previousState.drawings); // Khôi phục drawings
        setHistory((prev) => prev.slice(0, -1)); // Xóa trạng thái hiện tại
        redrawCanvas(); // Vẽ lại canvas
      };
      img.src = previousState.canvasData;
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    setDrawings([]);
    saveToHistory();
  };

  const handleSave = () => {
    const bgCanvas = backgroundCanvasRef.current;
    const drawCanvas = canvasRef.current;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.drawImage(bgCanvas, 0, 0);
    tempCtx.drawImage(drawCanvas, 0, 0);

    const uri = tempCanvas.toDataURL("image/png");
    onSave(uri);
  };

  const handleZoomIn = () => {
    setImageScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setImageScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-xl w-[95vw] max-w-7xl max-h-[95vh] overflow-auto">
        <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
          <Edit2 className="w-5 h-5 mr-2" />
          Chỉnh sửa ảnh
        </h3>

        <div className="flex space-x-2 mb-4 flex-wrap gap-2">
          <button
            onClick={() => setTool("pen")}
            className={`px-3 py-1 rounded-lg text-sm ${tool === "pen" ? "bg-blue-600" : "bg-gray-700"} text-white`}
          >
            Bút
          </button>
          <button
            onClick={() => setTool("rect")}
            className={`px-3 py-1 rounded-lg text-sm ${tool === "rect" ? "bg-blue-600" : "bg-gray-700"} text-white`}
          >
            Hình chữ nhật
          </button>
          <button
            onClick={() => setTool("circle")}
            className={`px-3 py-1 rounded-lg text-sm ${tool === "circle" ? "bg-blue-600" : "bg-gray-700"} text-white`}
          >
            Hình tròn
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-3 py-1 rounded-lg text-sm ${tool === "eraser" ? "bg-blue-600" : "bg-gray-700"} text-white`}
          >
            Tẩy
          </button>
          <button
            onClick={() => setTool("text")}
            className={`px-3 py-1 rounded-lg text-sm ${tool === "text" ? "bg-blue-600" : "bg-gray-700"} text-white`}
          >
            Văn bản
          </button>

          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded-lg text-sm"
          >
            <option value="#ff0000">Đỏ</option>
            <option value="#00ff00">Xanh lá</option>
            <option value="#0000ff">Xanh dương</option>
            <option value="#000000">Đen</option>
            <option value="#ffffff">Trắng</option>
            <option value="#ffff00">Vàng</option>
            <option value="#ff00ff">Tím</option>
            <option value="#00ffff">Cyan</option>
          </select>

          <select
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="bg-gray-700 text-white px-2 py-1 rounded-lg text-sm"
          >
            <option value={2}>2px</option>
            <option value={3}>3px</option>
            <option value={5}>5px</option>
            <option value={8}>8px</option>
            <option value={12}>12px</option>
            <option value={16}>16px</option>
          </select>

          <button
            onClick={handleUndo}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Hoàn tác"
            disabled={history.length <= 1}
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Xóa tất cả"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            title="Xoay ảnh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-gray-700 rounded-lg overflow-auto max-h-[60vh] flex justify-center">
          <div className="relative" style={{ minWidth: canvasWidth + "px", minHeight: canvasHeight + "px" }}>
            <canvas
              ref={backgroundCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute top-0 left-0 border border-gray-600"
              style={{ zIndex: 1 }}
            />
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="relative border border-gray-600 cursor-crosshair"
              style={{ zIndex: 2 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {showTextInput && (
              <div
                className="absolute z-30 bg-white rounded-lg shadow-lg border-2 border-blue-500"
                style={{
                  left: Math.min(textPosition.x, canvasWidth - 200) + "px",
                  top: Math.max(textPosition.y - 40, 10) + "px",
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleTextKeyPress}
                  className="p-3 bg-white text-black rounded-lg min-w-48 outline-none"
                  style={{
                    fontSize: "16px",
                    fontFamily: "Arial, sans-serif",
                  }}
                  autoFocus
                  placeholder="Nhập văn bản..."
                />
                <div className="text-xs text-gray-600 p-2 border-t">
                  Enter: Xác nhận | Esc: Hủy
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-gray-400 text-sm">
            Scale: {Math.round(imageScale * 100)}% | Rotation: {imageRotation}°
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;