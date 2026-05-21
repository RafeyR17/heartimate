export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#080608',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
      <p style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'clamp(80px, 15vw, 160px)',
        color: '#e8507a',
        fontStyle: 'italic',
        lineHeight: 1,
        margin: 0,
        opacity: 0.3
      }}>
        404
      </p>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'clamp(28px, 4vw, 48px)',
        color: 'white',
        margin: 0
      }}>
        Lost in the dark.
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '15px',
        fontFamily: 'var(--font-body)',
        margin: 0
      }}>
        This page doesn&apos;t exist.
      </p>
      <a href="/home" style={{
        marginTop: '24px',
        background: '#e8507a',
        color: 'white',
        padding: '12px 32px',
        borderRadius: '50px',
        textDecoration: 'none',
        fontSize: '14px',
        fontFamily: 'var(--font-body)'
      }}>
        Go home →
      </a>
    </div>
  )
}
