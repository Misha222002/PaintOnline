import React, { useEffect, useRef, useState } from "react";
import "../styles/convas.scss";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useParams } from "react-router-dom";
import axios from "axios";
import Rect from "../tools/Rect";

const Convas = () => {
  const params = useParams();
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(true);

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    // toolState.setTool(new Brush(canvasRef.current));
    const ctx = canvasRef.current.getContext("2d");
    axios
      .get(`http://localhost:5000/image?id=${params.id}`)
      .then((response) => {
        const img = new Image();
        img.src = response.data;
        img.onload = () => {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          ctx.drawImage(
            img,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          ctx.stroke();
        };
      });
  }, []);

  const mouseDownHandler = () => {
    canvasState.pushToUndo(canvasRef.current.toDataURL());
  };

  const mouseUpHandler = () => {
    axios
      .post(`http://localhost:5000/image?id=${params.id}`, {
        img: canvasRef.current.toDataURL(),
      })
      .then((response) => console.log(response));
  };

  useEffect(() => {
    if (canvasState.username) {
      const socket = new WebSocket("ws://localhost:5000/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      console.log(canvasRef.current, socket, params.id);
      toolState.setTool(new Brush(canvasRef.current, socket, params.id));
      socket.onopen = () => {
        console.log("connection success");
        socket.send(
          JSON.stringify({
            id: params.id,
            username: canvasState.username,
            method: "connection",
          })
        );
        socket.onmessage = (event) => {
          let message = JSON.parse(event.data);
          switch (message.method) {
            case "connection":
              console.log(`Пользователь ${message.username} присоеденился`);
              break;
            case "draw":
              drawHendler(message);
              break;
          }
        };
      };
    }
  }, [canvasState.username]);

  const drawHendler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    switch (figure.type) {
      case "brush":
        Brush.draw(ctx, figure.x, figure.y);
        break;
      case "rect":
        Rect.staticDraw(
          ctx,
          figure.x,
          figure.y,
          figure.width,
          figure.height,
          figure.color
        );
        break;
      case "finish":
        ctx.beginPath();
        break;
    }
  };

  const connectHandler = () => {
    canvasState.setUsername(usernameRef.current.value);
    setModal(false);
  };
  return (
    <div className="canvas">
      <Modal show={modal} onHide={() => {}}>
        <Modal.Header closeButton>
          <Modal.Title>Введите ваше имя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input ref={usernameRef} type="text" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => connectHandler()}>
            Войти
          </Button>
        </Modal.Footer>
      </Modal>
      <canvas
        onMouseDown={() => mouseDownHandler()}
        onMouseUp={() => mouseUpHandler()}
        ref={canvasRef}
        width={600}
        height={400}
      ></canvas>
    </div>
  );
};

export default observer(Convas);
