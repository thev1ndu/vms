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

interface TaskApplicationEmailProps {
  creatorName?: string;
  applicantName?: string;
  applicantVolunteerId?: string;
  taskTitle: string;
  taskDescription: string;
  taskMode: string;
  taskCategory: string;
  taskXpReward: number;
  baseUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const TaskApplicationEmail = ({
  creatorName = 'Task Creator',
  applicantName,
  applicantVolunteerId,
  taskTitle,
  taskDescription,
  taskMode,
  taskCategory,
  taskXpReward,
  baseUrl: baseUrlProp,
}: TaskApplicationEmailProps) => {
  const previewText = `New Application for Task: ${taskTitle}`;
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
              New Applicant for <strong>{taskTitle}</strong>
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hello {creatorName},
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              A volunteer has applied for your task{' '}
              <strong>"{taskTitle}"</strong>.
            </Text>

            <Section className="my-[20px] rounded bg-[#f6f9fc] p-[16px]">
              <Heading className="text-[16px] font-semibold text-black m-0 mb-[12px]">
                APPLICANT INFORMATION
              </Heading>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Name:</strong> {applicantName || 'Not provided'}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Volunteer ID:</strong>{' '}
                {applicantVolunteerId || 'Not assigned'}
              </Text>
            </Section>

            <Section className="my-[20px] rounded bg-[#f0f8ff] p-[16px]">
              <Heading className="text-[16px] font-semibold text-black m-0 mb-[12px]">
                TASK INFORMATION
              </Heading>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Title:</strong> {taskTitle}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Description:</strong> {taskDescription}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Mode:</strong> {taskMode}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Category:</strong> {taskCategory}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>XP Reward:</strong> {taskXpReward}
              </Text>
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={`${finalBaseUrl}/admin/tasks`}
              >
                Manage Applications
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              You can manage this application and view all applicants in the
              admin panel.
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

export default TaskApplicationEmail;
