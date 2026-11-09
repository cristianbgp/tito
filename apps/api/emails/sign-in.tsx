import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "react-email";
import { emailCopyFor } from "../src/i18n/email";
import type { Locale } from "../src/i18n/locale";

export interface SignInEmailProps {
  url?: string;
  locale?: Locale;
}

export default function SignInEmail({
  url = "http://localhost:5173",
  locale = "en",
}: SignInEmailProps) {
  const emailCopy = emailCopyFor(locale);
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{emailCopy.signIn.subject}</Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f2",
          color: "#202321",
          fontFamily: "Arial, sans-serif",
          padding: "40px 16px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "40px",
            maxWidth: "480px",
            borderTop: "4px solid #bf503b",
          }}
        >
          <Text
            style={{
              color: "#bf503b",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            {emailCopy.signIn.brand}
          </Text>
          <Heading style={{ fontSize: "28px", lineHeight: "36px" }}>
            {emailCopy.signIn.heading}
          </Heading>
          <Text>{emailCopy.signIn.description}</Text>
          <Button
            href={url}
            style={{
              backgroundColor: "#bf503b",
              color: "#ffffff",
              padding: "14px 22px",
              borderRadius: "6px",
              fontWeight: 700,
            }}
          >
            {emailCopy.signIn.action}
          </Button>
          <Text
            style={{ fontSize: "13px", color: "#666b67", marginTop: "28px" }}
          >
            {emailCopy.signIn.expiration}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

SignInEmail.PreviewProps = {
  url: "http://localhost:5173/?preview=sign-in",
} satisfies SignInEmailProps;
