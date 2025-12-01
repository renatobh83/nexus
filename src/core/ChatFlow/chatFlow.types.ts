interface Configuration {
  maxRetryBotMessage: {
    destiny: string;
    number: number;
    type: number;
  };
  notOptionsSelectMessage: {
    message: string;
    step: string;
  };
  notResponseMessage: {
    destiny: string;
    time: number;
    type: number;
  };
}
interface NodeList {
  ico?: string;
  id: string;
  left: string;
  name: string;
  status: string;
  style?: string | any;
  top: string;
  type?: string;
  viewOnly?: boolean;
  configurations?: Configuration;
  actions?: [];
  conditions?: [];
  interactions?: [];
}

interface Line {
  connector: string;
  from: string;
  paintStyle: string | any;
  to: string;
}
export interface Flow {
  name: string;
  lineList: Line[];
  nodeList: NodeList[];
}
export interface ChatFlowData {
  flow: Flow;
  name: string;
  userId: number;
  isActive: boolean;
  celularTeste?: string;
  tenantId: number;
}
