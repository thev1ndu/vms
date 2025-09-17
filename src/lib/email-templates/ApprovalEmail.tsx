import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface ApprovalEmailProps {
  name?: string;
  volunteerId?: string;
  baseUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const ApprovalEmail = ({
  name = 'there',
  volunteerId,
  baseUrl: baseUrlProp,
}: ApprovalEmailProps) => {
  const previewText = `Welcome to Patrons at Yogeshwari`;
  const finalBaseUrl = baseUrlProp || baseUrl;

  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src="/yogeshwari.png"
                alt="Yogeshwari Logo"
                className="mx-auto h-28 my-0 rounded-full"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Join <strong>Patrons</strong> on <strong>Yogeshwari</strong>
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hello {name},
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              Great news! Your account has been approved and you're now
              officially part of the <strong>Yogeshwari</strong> community.
            </Text>

            {volunteerId && (
              <Section className="my-[20px] rounded bg-[#f6f9fc] p-[16px]">
                <Text className="text-[14px] text-black leading-[24px] m-0">
                  <strong>Your Volunteer ID:</strong> {volunteerId}
                </Text>
                <Text className="text-[12px] text-[#666666] leading-[20px] m-0 mt-[8px]">
                  Keep this ID handy - you'll need it for various activities and
                  check-ins.
                </Text>
              </Section>
            )}

            <Text className="text-[14px] text-black leading-[24px]">
              You can now access all the features of the platform:
            </Text>
            <Section className="my-[20px]">
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • Browse and apply for volunteer tasks
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • Connect with other volunteers
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • Earn XP and level up your volunteer profile
              </Text>
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={`${finalBaseUrl}/dashboard`}
              >
                Get Started
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              If you have any questions or need assistance, don't hesitate to
              reach out to our support team.
            </Text>

            <Text className="text-[14px] text-black leading-[24px]">
              Welcome aboard and thank you for joining our volunteer community!
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              Best regards,
              <br />
              <strong>Yogeshwari</strong>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ApprovalEmail;
