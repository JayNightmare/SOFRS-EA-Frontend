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
  recordId: string | null;
  setUserData: (data: UserData) => void;
  setFaceScanResult: (result: FaceScanResult) => void;
  setRecordId: (id: string | null) => void;
  reset: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: PropsWithChildren) {
  const [userData, setUserDataState] = useState<UserData | null>(null);
  const [faceScanResult, setFaceScanResultState] = useState<FaceScanResult>({});
  const [recordId, setRecordIdState] = useState<string | null>(null);

  const setUserData = useCallback((data: UserData) => {
    setUserDataState(data);
  }, []);

  const setFaceScanResult = useCallback((result: FaceScanResult) => {
    setFaceScanResultState(result);
  }, []);

  const setRecordId = useCallback((id: string | null) => {
    setRecordIdState(id);
  }, []);

  const reset = useCallback(() => {
    setUserDataState(null);
    setFaceScanResultState({});
    setRecordIdState(null);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ userData, faceScanResult, recordId, setUserData, setFaceScanResult, setRecordId, reset }),
    [userData, faceScanResult, recordId, setUserData, setFaceScanResult, setRecordId, reset],
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
