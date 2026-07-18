
import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div style={styles.backdrop}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{title}</h2>
                    <button onClick={onClose} style={styles.closeButton}>&times;</button>
                </div>
                <div style={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const styles = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999, // Ensure it's higher than the sidebar's 99999
    },
    modal: {
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--bg-tertiary)',
        paddingBottom: '10px',
        marginBottom: '20px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
        color: 'var(--text-main)',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        color: 'var(--text-main)',
        cursor: 'pointer',
    },
    content: {
        color: 'var(--text-secondary)',
    },
};

export default Modal;
