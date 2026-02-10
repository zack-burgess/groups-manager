interface Props {
  onClose: () => void;
}

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>About</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body about-body">
          <h3>Groups Manager</h3>
          <p>
            Vibecoded by <strong>Zack Burgess</strong> and <strong>Claude</strong>.
          </p>
          <p>
            Clone the repo:{" "}
            <a href="https://github.com/zack-burgess/groups-manager" target="_blank" rel="noopener noreferrer">
              github.com/zack-burgess/groups-manager
            </a>
          </p>
          <p>
            To learn more about the discovery and delivery process, visit{" "}
            <a href="https://zackburgess.co/case-study" target="_blank" rel="noopener noreferrer">
              zackburgess.co/case-study
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
