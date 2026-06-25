const ISSUE_LIBRARY = {
  NodeNotReady: {
    rootCause: "Kubelet, node pressure, or node heartbeat issues.",
    commands: [
      "kubectl describe node <node-name>",
      "kubectl get events -A --sort-by=.metadata.creationTimestamp",
    ],
  },
  PodPending: {
    rootCause: "The scheduler could not place the pod on any node.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl get events -n <namespace> --sort-by=.metadata.creationTimestamp",
    ],
  },
  ImagePullBackOff: {
    rootCause: "The image tag, registry access, or credentials are invalid.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl get secret -n <namespace>",
      "kubectl logs <pod-name> -n <namespace>",
    ],
  },
  ErrImagePull: {
    rootCause: "The container image could not be fetched from the registry.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl get pod <pod-name> -n <namespace> -o wide",
    ],
  },
  CrashLoopBackOff: {
    rootCause: "The container starts and exits repeatedly because of app or probe failures.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl logs <pod-name> -n <namespace> --previous",
    ],
  },
  OOMKilled: {
    rootCause: "The container exceeded its memory limit.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl top pod <pod-name> -n <namespace>",
    ],
  },
  FailedScheduling: {
    rootCause: "The scheduler lacked capacity or a placement rule blocked the pod.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl get nodes",
    ],
  },
  FailedMount: {
    rootCause: "A volume or PVC could not be mounted.",
    commands: [
      "kubectl describe pod <pod-name> -n <namespace>",
      "kubectl get pvc -n <namespace>",
    ],
  },
  HighRestartCount: {
    rootCause: "The workload is unstable or probes are too aggressive.",
    commands: [
      "kubectl logs <pod-name> -n <namespace>",
      "kubectl describe pod <pod-name> -n <namespace>",
    ],
  },
  ReplicaMismatch: {
    rootCause: "The deployment has not reached the desired replica count.",
    commands: [
      "kubectl rollout status deployment/<name> -n <namespace>",
      "kubectl describe deployment <name> -n <namespace>",
    ],
  },
};

const TERMINAL_SUFFIX_PATTERN = /(?:-[a-z0-9]{5,}){2,}$/i;

export function normalizeResourceName(resource) {
  if (!resource || resource === "-") {
    return "Unknown";
  }

  if (TERMINAL_SUFFIX_PATTERN.test(resource)) {
    return resource.replace(TERMINAL_SUFFIX_PATTERN, "");
  }

  return resource;
}

export function resolveIssueCommands(issue) {
  const resource = normalizeResourceName(issue.resource);
  const namespace = issue.namespace || "default";

  return (issue.commands || []).map((command) =>
    command
      .replaceAll("<pod-name>", resource)
      .replaceAll("<deployment-name>", resource)
      .replaceAll("<name>", resource)
      .replaceAll("<node-name>", resource)
      .replaceAll("<namespace>", namespace)
  );
}

function normalizeKey(issue) {
  return [issue.type, issue.namespace, issue.recommendation].join("|");
}

export function groupIssues(issues = []) {
  const grouped = new Map();

  issues.forEach((issue) => {
    const key = normalizeKey(issue);
    const existing = grouped.get(key);
    const resource = normalizeResourceName(issue.resource);

    if (existing) {
      if (!existing.resources.includes(resource)) {
        existing.resources.push(resource);
      }
      existing.count += 1;
      return;
    }

    const library = ISSUE_LIBRARY[issue.type] || {};
    grouped.set(key, {
      ...issue,
      count: 1,
      resources: [resource],
      rootCause: library.rootCause || "The cluster state suggests this workload needs attention.",
      commands: library.commands || ["kubectl describe pod <pod-name> -n <namespace>"],
      renderedCommands: resolveIssueCommands({
        ...issue,
        resource,
        commands: library.commands || ["kubectl describe pod <pod-name> -n <namespace>"],
      }),
    });
  });

  return Array.from(grouped.values());
}

export function countIssuesBySeverity(issues = []) {
  return issues.reduce(
    (acc, issue) => {
      const severity = (issue.severity || "info").toLowerCase();
      acc.total += 1;
      if (severity === "high") acc.high += 1;
      else if (severity === "medium") acc.medium += 1;
      else if (severity === "critical") acc.critical += 1;
      else acc.info += 1;
      return acc;
    },
    { total: 0, high: 0, medium: 0, critical: 0, info: 0 }
  );
}

export function getMostCommonIssue(issues = []) {
  if (issues.length === 0) return null;

  const counts = new Map();
  issues.forEach((issue) => {
    const key = issue.type;
    const current = counts.get(key) || 0;
    counts.set(key, current + 1);
  });

  let best = null;
  counts.forEach((count, type) => {
    if (!best || count > best.count) {
      best = { type, count };
    }
  });

  return best;
}

export function getMostAffectedNamespace(issues = []) {
  if (issues.length === 0) return "Unknown";

  const counts = new Map();
  issues.forEach((issue) => {
    const namespace = issue.namespace || "Unknown";
    const current = counts.get(namespace) || 0;
    counts.set(namespace, current + 1);
  });

  let best = null;
  counts.forEach((count, namespace) => {
    if (!best || count > best.count) {
      best = { namespace, count };
    }
  });

  return best?.namespace || "Unknown";
}

export function getIssuePriority(issues = []) {
  if (issues.some((issue) => (issue.severity || "").toLowerCase() === "high")) {
    return "Critical";
  }
  if (issues.some((issue) => (issue.severity || "").toLowerCase() === "medium")) {
    return "Warning";
  }
  return "Healthy";
}
