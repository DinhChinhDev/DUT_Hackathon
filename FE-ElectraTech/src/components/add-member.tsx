"use client";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useState } from "react";
import { getDatabase, ref, set, get } from "firebase/database";
import { Alert } from "react-bootstrap";

interface IProps {
  showModalCreate: boolean;
  setShowModalCreate: (useShow: boolean) => void;
  providerName: string;
}

function Example(props: IProps) {
  const { showModalCreate, setShowModalCreate, providerName } = props;
  const [accountUser, setAccountUser] = useState("");
  const [password, setPassword] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger">();

  const handleSaveButton = async () => {
    const database = getDatabase();
    const userRef = ref(database, `UserAccount/${accountUser}`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      if (!password) {
        const providersRef = ref(
          database,
          `UserAccount/${accountUser}/Providers`
        );
        const providersSnapshot = await get(providersRef);
        const currentProviders = providersSnapshot.val() || "";

        const updatedProviders = currentProviders
          ? `${currentProviders} - ${providerName}`
          : providerName;
        set(providersRef, updatedProviders);
        handleCloseButton();
      } else {
        setAlertMessage("User already exists.");
        setShowAlert(true);
        setAlertVariant("danger");
      }
    } else {
      const userAccountRef = ref(database, `UserAccount/${accountUser}`);
      set(userAccountRef, { password: password, Providers: providerName });
      handleCloseButton();
    }
  };

  const handleCloseButton = () => {
    setShowModalCreate(false);
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
          <Modal.Title>Add Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Account User</Form.Label>
              <Form.Control
                type="text"
                onChange={(e) => setAccountUser(e.target.value)}
              />
            </Form.Group>
          </Form>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Password (Existing account? Skip entry).</Form.Label>
              <Form.Control
                type="text"
                onChange={(e) => setPassword(e.target.value)}
              />
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
