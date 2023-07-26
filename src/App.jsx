import { useEffect, useState } from "react";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import { Euler, Matrix4 } from "three";
import { useGLTF } from "@react-three/drei";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import "./App.css";

let video;
let detector;
let lastVideoTime = -1;
let headMesh;
let blendshapes = [];
let rotation;

// AVATAR COMPONENT
function Avatar({ avatarUrl }) {
  const avatar = useGLTF(`${avatarUrl}?morphTargets=ARKit&textureAtlas=1024`);
  const { nodes } = useGraph(avatar.scene);

  useEffect(() => {
    headMesh = nodes.Wolf3D_Avatar;
  }, [nodes]);

  useFrame((_, delta) => {
    if (headMesh != null) {
      blendshapes.forEach((blendshape) => {
        let index = headMesh.morphTargetDictionary[blendshape.categoryName];
        if (index >= 0) {
          headMesh.morphTargetInfluences[index] = blendshape.score;
        }
      });
    }

    nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
    nodes.Neck.rotation.set(rotation.x / 3, rotation.y / 3, rotation.z / 3);
    nodes.Spine1.rotation.set(rotation.x / 5, rotation.y / 5, rotation.z / 5);
  });

  return <primitive object={avatar.scene} position={[0, -1.65, 4.6]} />;
}

function App() {
  const [url, setUrl] = useState(
    "https://models.readyplayer.me/64c0b0250a4ad5e1bbb774b5.glb"
  );

  const onChangeHandler = (event) => {
    setUrl(() => event.target.value);
  };

  const setup = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    detector = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });

    video = document.getElementById("video");
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1280, height: 720 },
      })
      .then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predict);
      })
      .catch((err) => console.log(err));
  };

  const predict = () => {
    const nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;

      const results = detector.detectForVideo(video, nowInMs);

      if (
        results.facialTransformationMatrixes &&
        results.facialTransformationMatrixes.length > 0 &&
        results.faceBlendshapes.length > 0 &&
        results.faceBlendshapes[0].categories
      ) {
        blendshapes = results.faceBlendshapes[0].categories;
        const matrix = new Matrix4().fromArray(
          results.facialTransformationMatrixes[0].data
        );
        rotation = new Euler().setFromRotationMatrix(matrix);
      }
    }

    requestAnimationFrame(predict);
  };

  useEffect(() => {
    setup();
  });

  return (
    <>
      <main>
        <video autoPlay id="video" />

        <input
          type="text"
          onChange={onChangeHandler}
          placeholder="Enter the URL of your avatar"
          style={{ width: window.innerWidth }}
        />

        <Canvas
          style={{
            backgroundColor: "white",
            height: 400,
          }}
        >
          <ambientLight intensity={0.5} />
          <Avatar avatarUrl={url} />
        </Canvas>
      </main>

      <div className="fly">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </>
  );
}

export default App;
