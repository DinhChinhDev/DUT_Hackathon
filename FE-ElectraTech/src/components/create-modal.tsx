"use client";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useState } from "react";
import { getDatabase, ref, set } from "firebase/database";
import { Alert } from "react-bootstrap";

interface IProps {
  showModalCreate: boolean;
  setShowModalCreate: (useShow: boolean) => void;
  providers: string[];
  username: string | undefined;
}

function Example(props: IProps) {
  const { showModalCreate, setShowModalCreate, providers, username } = props;
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [roomName, setRoomName] = useState<string>("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger">();

  const handleCloseButton = () => {
    setShowModalCreate(false);
  };
  const handleSaveButton = async () => {
    try {
      const database = getDatabase();
      const roomRef = ref(
        database,
        `UserAccount/${username}/Rooms/${roomName}`
      );
      const providersString = selectedProviders.join(" - ");
      await set(roomRef, providersString);

      handleCloseButton();
    } catch (error) {
      console.error("Error saving data to Firebase:", error);
      setAlertMessage("Error saving data to Firebase");
      setShowAlert(true);
      setAlertVariant("danger");
    }
  };

  return (
    <>
      <Modal
        show={showModalCreate}
        onHide={() => handleCloseButton()}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        {showAlert && (
          <Alert
            variant={alertVariant}
            onClose={() => setShowAlert(false)}
            dismissible
          >
            {alertMessage}
          </Alert>
        )}
        <Modal.Header closeButton>
          <Modal.Title>Add Room</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Room name</Form.Label>
              <Form.Control
                type="text"
                onChange={(e) => setRoomName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Providers</Form.Label>
              <Form.Select
                as="select"
                onChange={(e) =>
                  setSelectedProviders(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
              >
                {providers.map((provider, index) => (
                  <option key={index}>{provider}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => handleCloseButton()}>
            Close
          </Button>
          <Button variant="primary" onClick={() => handleSaveButton()}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Example;
