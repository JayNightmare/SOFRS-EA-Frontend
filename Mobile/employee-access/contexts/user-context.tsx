import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { FaceScanResult, UserData } from '@/constants/types';

interface UserContextValue {
  userData: UserData | null;
  faceScanResult: FaceScanResult;
  setUserData: (data: UserData) => void;
  setFaceScanResult: (result: FaceScanResult) => void;
  reset: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: PropsWithChildren) {
  const [userData, setUserDataState] = useState<UserData | null>(null);
  const [faceScanResult, setFaceScanResultState] = useState<FaceScanResult>({});

  const setUserData = useCallback((data: UserData) => {
    setUserDataState(data);
  }, []);

  const setFaceScanResult = useCallback((result: FaceScanResult) => {
    setFaceScanResultState(result);
  }, []);

  const reset = useCallback(() => {
    setUserDataState(null);
    setFaceScanResultState({});
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ userData, faceScanResult, setUserData, setFaceScanResult, reset }),
    [userData, faceScanResult, setUserData, setFaceScanResult, reset],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
