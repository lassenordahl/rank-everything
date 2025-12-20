
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import { DashboardService, type SystemStatus } from '../lib/dashboard-service.js';

const useSystemStatus = (service: DashboardService) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const data = await service.getSystemStatus();
        if (mounted) {
          setStatus(data);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };

    fetchStatus();
    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [service]);

  return { status, loading };
};

const Header = ({ environment }: { environment: string }) => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Gradient name="morning">
      <BigText text="Rank Everything" font="tiny" />
    </Gradient>
    <Text color="gray">
      CLI Dashboard • {environment.toUpperCase()} Environment
    </Text>
  </Box>
);

const StatBox = ({ label, value, color = "green" }: { label: string, value: string | number, color?: string }) => (
  <Box borderStyle="round" borderColor={color} flexDirection="column" paddingX={1} marginRight={1} flexGrow={1}>
    <Text color={color} bold>{label}</Text>
    <Text>{value}</Text>
  </Box>
);

const RecentItems = ({ items }: { items: SystemStatus['recentItems'] }) => (
  <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
    <Text bold underline>Recent Global Items</Text>
    {items.length === 0 ? (
      <Text italic color="gray">No items found</Text>
    ) : (
      items.map((item) => (
        <Box key={item.id} justifyContent="space-between">
          <Text>{item.emoji} {item.text}</Text>
          <Text color="gray">{new Date(item.created_at).toLocaleTimeString()}</Text>
        </Box>
      ))
    )}
  </Box>
);

export const Dashboard = ({ service }: { service: DashboardService }) => {
  const { exit } = useApp();
  const { status, loading } = useSystemStatus(service);
  const [activeTab, setActiveTab] = useState('overview'); // For future expansion via useInput

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }
  });

  if (loading) {
    return (
      <Box padding={2}>
        <Text color="green">
          <Spinner type="dots" /> Loading system status...
        </Text>
      </Box>
    );
  }

  if (!status) {
    return (
      <Box padding={2} flexDirection="column">
        <Text color="red">Failed to load system status.</Text>
        <Text color="gray">Press 'q' to exit.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header environment={status.environment} />

      <Box flexDirection="row" marginBottom={1}>
        <StatBox
          label="DB Connection"
          value={status.dbConnection ? "Connected" : "Disconnected"}
          color={status.dbConnection ? "green" : "red"}
        />
        <StatBox
          label="Global Items"
          value={status.itemsCount}
          color="cyan"
        />
        <StatBox
          label="Usage Today"
          value={status.emojiUsageToday}
          color="yellow"
        />
      </Box>

      <RecentItems items={status.recentItems} />

      <Box marginTop={1} borderStyle="round" borderColor="dim" paddingX={1}>
        <Text color="gray">Press 'q' or ESC to exit • Auto-refreshing every 5s</Text>
      </Box>
    </Box>
  );
};
