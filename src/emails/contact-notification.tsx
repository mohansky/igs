import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'

interface ContactNotificationProps {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  submittedAt: string
}

export function ContactNotification({
  name = 'Parent Name',
  email = 'parent@example.com',
  phone = '+91 9876 5432 10',
  subject = 'Admission Enquiry',
  message = 'I would like to know more about the admission process.',
  submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
}: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New contact form submission from {name} — {subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New Contact Submission</Heading>
          <Text style={subheading}>
            A visitor submitted the contact form on the IGS website.
          </Text>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Row style={detailRow}>
              <Column style={labelCol}>Name</Column>
              <Column style={valueCol}>{name}</Column>
            </Row>
            <Row style={detailRow}>
              <Column style={labelCol}>Email</Column>
              <Column style={valueCol}>{email}</Column>
            </Row>
            <Row style={detailRow}>
              <Column style={labelCol}>Phone</Column>
              <Column style={valueCol}>{phone}</Column>
            </Row>
            <Row style={detailRow}>
              <Column style={labelCol}>Subject</Column>
              <Column style={valueCol}>{subject}</Column>
            </Row>
            <Row style={detailRow}>
              <Column style={labelCol}>Submitted</Column>
              <Column style={valueCol}>{submittedAt}</Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={messageLabel}>Message</Text>
            <Text style={messageBody}>{message}</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated notification from Indo-German School. You can
            view and manage all submissions in the dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ContactNotification

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
  margin: '0 0 8px',
}

const subheading: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 20px',
}

const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const detailsSection: React.CSSProperties = {
  width: '100%',
}

const detailRow: React.CSSProperties = {
  marginBottom: '8px',
}

const labelCol: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  width: '100px',
  verticalAlign: 'top',
  paddingBottom: '8px',
}

const valueCol: React.CSSProperties = {
  fontSize: '14px',
  color: '#173a40',
  verticalAlign: 'top',
  paddingBottom: '8px',
}

const messageLabel: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  margin: '0 0 8px',
}

const messageBody: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#173a40',
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '8px',
  margin: '0',
  whiteSpace: 'pre-wrap',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
}
