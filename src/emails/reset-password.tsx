import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ResetPasswordEmailProps {
  name: string
  url: string
}

export function ResetPasswordEmail({
  name = 'there',
  url = 'https://indogermanschool.com/reset-password',
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Indo-German School dashboard password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We received a request to reset the password for your Indo-German
            School dashboard account. Click the button below to choose a new
            one. This link expires in 1 hour.
          </Text>
          <Button href={url} style={button}>
            Reset password
          </Button>
          <Text style={small}>
            If the button doesn&apos;t work, copy this link into your browser:
            <br />
            {url}
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn&apos;t ask for this, you can ignore this email. Your
            password won&apos;t change.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ResetPasswordEmail

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 40px',
  maxWidth: '560px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
}

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#173a40',
  margin: '0 0 16px',
}

const text: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#173a40',
  margin: '0 0 12px',
}

const button: React.CSSProperties = {
  backgroundColor: '#173a40',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 22px',
  borderRadius: '999px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}

const small: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  wordBreak: 'break-all',
  margin: '0',
}

const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
}
