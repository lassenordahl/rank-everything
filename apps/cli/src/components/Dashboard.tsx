import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { DashboardService } from '../lib/dashboard-service.js';
import { type SystemStatus } from '../lib/dashboard-service.js';

const Header = ({ environment }: { environment: string }) => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Text color="cyan" bold>
      RANK EVERYTHING
    </Text>
    <Text color="gray">CLI Dashboard • {environment.toUpperCase()} Environment</Text>
  </Box>
);

const Cube = ({
  title,
  value,
  color = 'blue',
  subtext,
}: {
  title: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) => (
  <Box
    borderStyle="round"
    borderColor={color}
    flexDirection="column"
    paddingX={1}
    flexGrow={1}
    marginX={1}
  >
    <Text color="gray">{title}</Text>
    <Text bold color={color}>
      {value}
    </Text>
    {subtext && (
      <Text dimColor color="gray">
        {subtext}
      </Text>
    )}
  </Box>
);

// Multi-line chart component
const MultiLineChart = ({
  title,
  datasets,
  height = 12,
  width = 60,
}: {
  title: string;
  datasets: { label: string; color: string; data: number[] }[];
  height?: number;
  width?: number;
}) => {
  // Flatten data to find max value for scaling (filter out nulls/undefined)
  const allValues = datasets
    .flatMap((d) => d.data)
    .filter((v): v is number => v != null && !isNaN(v));
  const maxValue = allValues.length > 0 ? Math.max(...allValues, 10) : 10; // Minimum scale of 10

  const getPointHeight = (value: number) => Math.round((value / maxValue) * (height - 1));

  // Pad data to match width (Right alignment)
  // We want the latest data at the end (right).
  // If data.length < width, prepend nulls.
  // If data.length > width, slice from end.
  const processedDatasets = datasets.map((d) => {
    const raw = d.data;
    if (raw.length > width) return { ...d, data: raw.slice(-width) };
    const padded = Array(width - raw.length)
      .fill(null)
      .concat(raw);
    return { ...d, data: padded };
  });

  const rows = Array.from({ length: height }, (_, i) => {
    const rowIndex = height - 1 - i;
    const yLabel = Math.round(maxValue * (rowIndex / (height - 1)));

    // Construct the row as a series of Boxes
    const cells = Array.from({ length: width }, (_, colIndex) => {
      let char = ' ';
      let color = undefined;
      let isGrid = false;

      // Render datasets
      for (const dataset of processedDatasets) {
        const val = dataset.data[colIndex];
        if (val === null) continue;

        const ptHeight = getPointHeight(val);
        if (ptHeight === rowIndex) {
          char = '•'; // Cleaner point
          // Simple slope approximation can go here if we had prev value
          color = dataset.color;
        }
      }

      return (
        <Box key={colIndex} width={1} justifyContent="center">
          <Text color={color} dimColor={isGrid}>
            {char}
          </Text>
        </Box>
      );
    });

    return (
      <Box key={i} flexDirection="row">
        {/* Y-Axis Label */}
        <Box width={4} marginRight={1} justifyContent="flex-end">
          {i % 4 === 0 ? (
            <Text dimColor color="gray">
              {yLabel}
            </Text>
          ) : (
            <Text></Text>
          )}
        </Box>

        {/* Y-Axis Line */}
        <Box flexDirection="column">
          <Text color="gray" dimColor>
            │
          </Text>
        </Box>

        {/* Plot Area */}
        <Box marginLeft={1}>{cells}</Box>
      </Box>
    );
  });

  return (
    <Box borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1} flexGrow={1}>
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold>{title}</Text>
        <Box flexDirection="row" gap={2}>
          {datasets.map((d, i) => (
            <Text key={i} color={d.color}>
              ● {d.label}
            </Text>
          ))}
        </Box>
      </Box>

      {/* Chart Rows */}
      {rows}

      {/* X-Axis Line */}
      <Box flexDirection="row" marginLeft={5}>
        <Text color="gray" dimColor>
          └
        </Text>
        <Text color="gray" dimColor>
          {'─'.repeat(width + 1)}
        </Text>
      </Box>

      <Box marginLeft={5} justifyContent="space-between" width={width}>
        <Text dimColor color="gray">
          10m ago
        </Text>
        <Text dimColor color="gray">
          Now
        </Text>
      </Box>
    </Box>
  );
};

export const Dashboard = ({ service }: { service: DashboardService }) => {
  const { exit } = useApp();
  // We manage our own refresh cycle to build history
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [history, setHistory] = useState<{
    rooms: number[];
    users: number[]; // Mocked for now
    rankings: number[]; // Derived from delta of itemsCount
  }>({
    rooms: [],
    users: [],
    rankings: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual polling hook since we need history state
  useEffect(() => {
    let mounted = true;
    let lastItemsCount = 0;
    const abortController = new AbortController();

    const fetchStats = async () => {
      if (!mounted) return;

      try {
        const s = await service.getSystemStatus(abortController.signal);
        if (!mounted) return;

        setStatus(s);
        setLoading(false);

        // Update History (ensure all values are numbers, not null)
        setHistory((prev) => {
          // Max 60 points for the new width
          const maxPoints = 60;

          const newRooms = [...prev.rooms, s.activeRooms ?? 0].slice(-maxPoints);
          const newUsers = [...prev.users, s.activeUsers ?? 0].slice(-maxPoints);

          // Rankings rate: Delta of items
          const delta = lastItemsCount > 0 ? Math.max(0, (s.itemsCount ?? 0) - lastItemsCount) : 0;
          lastItemsCount = s.itemsCount ?? 0;
          const newRankings = [...prev.rankings, delta].slice(-maxPoints);

          return { rooms: newRooms, users: newUsers, rankings: newRankings };
        });
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        if (mounted) setError(String(err));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => {
      mounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, [service]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color="green">Initializing Real-time Dashboard...</Text>
        <Text color="gray">Connecting to global network...</Text>
      </Box>
    );
  }

  if (error || !status) {
    return (
      <Box padding={2} flexDirection="column">
        <Text color="red">Connection Failure: {error}</Text>
        <Text color="gray">Press 'q' to exit.</Text>
      </Box>
    );
  }

  // Pad data with 0s if empty start
  const chartData = [
    { label: 'Active Users', color: 'green', data: history.users },
    { label: 'Active Rooms', color: 'magenta', data: history.rooms },
    { label: 'Rankings/5s', color: 'cyan', data: history.rankings },
  ];

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Header environment={status.environment} />

      {/* Top Row: Key Metrics Cubes */}
      <Box flexDirection="row" marginBottom={1}>
        <Cube title="Active Rooms" value={status.activeRooms ?? 0} color="magenta" subtext="Live" />
        <Cube
          title="Active Users"
          value={status.activeUsers ?? 0}
          color="green"
          subtext="Connected"
        />
        <Cube title="Total Items" value={status.itemsCount ?? 0} color="cyan" subtext="All Time" />
        <Cube
          title="DB Status"
          value={status.dbConnection ? 'OK' : 'ERR'}
          color={status.dbConnection ? 'green' : 'red'}
        />
      </Box>

      {/* Middle Row: Live Chart */}
      <Box flexDirection="row" marginBottom={1} paddingX={1} height={15}>
        <MultiLineChart title="Network Activity (Live)" datasets={chartData} />
      </Box>

      {/* Bottom Row: Live Feed */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1} marginX={1}>
        <Box marginBottom={1}>
          <Text bold underline>
            Live Item Feed
          </Text>
        </Box>
        {status.recentItems.length === 0 ? (
          <Text italic color="gray">
            No items found
          </Text>
        ) : (
          status.recentItems.slice(0, 3).map((item) => (
            <Box key={item.id} justifyContent="space-between" marginBottom={0}>
              <Text>
                {item.emoji} {item.text}
              </Text>
              <Text color="gray" dimColor>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} paddingX={1} justifyContent="center">
        <Text color="gray">Press 'q' to exit • Auto-refresh: 5s</Text>
      </Box>
    </Box>
  );
};
