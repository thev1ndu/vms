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

interface TaskAcceptanceEmailProps {
  userName?: string;
  userVolunteerId?: string;
  taskTitle: string;
  taskDescription: string;
  taskMode: string;
  taskCategory: string;
  taskXpReward: number;
  assignedCount: number;
  requiredCount: number;
  creatorName?: string;
  creatorEmail?: string;
  baseUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const TaskAcceptanceEmail = ({
  userName = 'Volunteer',
  userVolunteerId,
  taskTitle,
  taskDescription,
  taskMode,
  taskCategory,
  taskXpReward,
  assignedCount,
  requiredCount,
  creatorName,
  creatorEmail,
  baseUrl: baseUrlProp,
}: TaskAcceptanceEmailProps) => {
  const previewText = `Congratulations! You've been accepted for ${taskTitle}`;
  const finalBaseUrl = baseUrlProp || baseUrl;
  const isTaskFull = assignedCount >= requiredCount;

  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container
            className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            <Section className="mt-[32px]">
              <Img
                src="https://i.postimg.cc/RVgNFgRS/yogeshwari.png"
                alt="Yogeshwari Logo"
                className="mx-auto h-28 my-0 rounded-full"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Congratulations!
              <br />
              You've been accepted for <strong>{taskTitle}</strong>
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hello {userName},
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              Great news! You have been accepted for the volunteer task{' '}
              <strong>"{taskTitle}"</strong>.
            </Text>

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

            <Section className="my-[20px] rounded bg-[#f6f9fc] p-[16px]">
              <Heading className="text-[16px] font-semibold text-black m-0 mb-[12px]">
                CURRENT STATUS
              </Heading>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Assigned Volunteers:</strong> {assignedCount}/
                {requiredCount}
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                <strong>Status:</strong> {isTaskFull ? 'FULL' : 'OPEN'}
              </Text>
            </Section>

            <Section className="my-[20px] rounded bg-[#f0fff0] p-[16px]">
              <Heading className="text-[16px] font-semibold text-black m-0 mb-[12px]">
                WHAT'S NEXT
              </Heading>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • You can now start working on this task
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • Make sure to complete it within the specified timeframe
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • You will earn <strong>{taskXpReward} XP</strong> upon
                completion
              </Text>
              <Text className="text-[14px] text-black leading-[24px] m-0">
                • Contact the task creator if you have any questions
                {creatorName && creatorEmail && (
                  <Text className="text-[14px] text-black leading-[24px] m-0">
                    <strong>Task Creator:</strong> {creatorName} (
                    <Link
                      href={`mailto:${creatorEmail}`}
                      className="text-blue-600 no-underline"
                    >
                      {creatorEmail}
                    </Link>
                    )
                  </Text>
                )}
              </Text>
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={`${finalBaseUrl}/me`}
              >
                View My Tasks
              </Button>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              Thank you for your commitment to volunteering!
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

export default TaskAcceptanceEmail;
