const fs = require('fs');
const filepath = 'src/components/Logistics.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const startMarker = "{activeSubTab === 'couriers' && (";
const endMarker = "      {activeSubTab === 'logs' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found via indexof");
  process.exit(1);
}

const replacement = `      {activeSubTab === 'couriers' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Available Integrations</h3>
              <p className="text-sm text-gray-500 mt-1">Connect and configure your delivery partners</p>
            </div>
            <button 
              onClick={handleSaveConfigs}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Steadfast */}
            <div className={\`bg-white rounded-3xl border transition-all duration-300 overflow-hidden \${expandedConfig === 'steadfast' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}\`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'steadfast' ? null : 'steadfast')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-blue-50">S</div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Steadfast Courier</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Automated delivery for Bangladesh</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.steadfast?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-colors \${expandedConfig === 'steadfast' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}\`}>
                    <ChevronDown size={18} className={\`text-gray-500 transition-transform duration-300 \${expandedConfig === 'steadfast' ? 'rotate-180' : ''}\`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'steadfast' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, isActive: !prev.steadfast?.isActive } }))}}
                        className={\`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden \${courierConfigs.steadfast?.isActive ? 'bg-blue-600' : 'bg-gray-300'}\`}
                      >
                        <div className={\`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${courierConfigs.steadfast?.isActive ? 'left-6' : 'left-1'}\`} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                      <input 
                        type="text" 
                        value={courierConfigs.steadfast?.apiKey || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, apiKey: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter API Key"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Secret Key</label>
                      <input 
                        type="password" 
                        value={courierConfigs.steadfast?.secretKey || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, secretKey: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Secret Key"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pathao */}
            <div className={\`bg-white rounded-3xl border transition-all duration-300 overflow-hidden \${expandedConfig === 'pathao' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}\`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'pathao' ? null : 'pathao')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-orange-50">P</div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-orange-500 transition-colors">Pathao Courier</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Fast and reliable delivery service</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.pathao?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-colors \${expandedConfig === 'pathao' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}\`}>
                    <ChevronDown size={18} className={\`text-gray-500 transition-transform duration-300 \${expandedConfig === 'pathao' ? 'rotate-180' : ''}\`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'pathao' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={courierConfigs.pathao?.isSandbox || false}
                            onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isSandbox: e.target.checked } }))}
                          />
                          <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-colors"></div>
                          <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 group-hover/sandbox:text-gray-800 uppercase tracking-widest transition-colors">Sandbox Mode</span>
                      </label>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isActive: !prev.pathao?.isActive } }))}}
                          className={\`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden \${courierConfigs.pathao?.isActive ? 'bg-orange-500' : 'bg-gray-300'}\`}
                        >
                          <div className={\`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${courierConfigs.pathao?.isActive ? 'left-6' : 'left-1'}\`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.clientId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Secret</label>
                      <input 
                        type="password" 
                        value={courierConfigs.pathao?.clientSecret || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientSecret: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Secret"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email (Username)</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.username || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, username: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                      <input 
                        type="password" 
                        value={courierConfigs.pathao?.password || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, password: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Password"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Store ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.storeId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, storeId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Pathao Store ID"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RedX */}
            <div className={\`bg-white rounded-3xl border transition-all duration-300 overflow-hidden \${expandedConfig === 'redx' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}\`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'redx' ? null : 'redx')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-red-50">R</div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">RedX</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Logistics for modern businesses</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.redx?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-colors \${expandedConfig === 'redx' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}\`}>
                    <ChevronDown size={18} className={\`text-gray-500 transition-transform duration-300 \${expandedConfig === 'redx' ? 'rotate-180' : ''}\`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'redx' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, isActive: !prev.redx?.isActive } }))}}
                        className={\`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden \${courierConfigs.redx?.isActive ? 'bg-red-600' : 'bg-gray-300'}\`}
                      >
                        <div className={\`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${courierConfigs.redx?.isActive ? 'left-6' : 'left-1'}\`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                    <input 
                      type="text" 
                      value={courierConfigs.redx?.apiKey || ''} 
                      onChange={e => setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, apiKey: e.target.value } }))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all shadow-sm" 
                      placeholder="Enter API Key"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Carrybee */}
            <div className={\`bg-white rounded-3xl border transition-all duration-300 overflow-hidden \${expandedConfig === 'carrybee' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}\`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'carrybee' ? null : 'carrybee')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-yellow-50">C</div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">Carrybee</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Fast and secure delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.carrybee?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-colors \${expandedConfig === 'carrybee' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}\`}>
                    <ChevronDown size={18} className={\`text-gray-500 transition-transform duration-300 \${expandedConfig === 'carrybee' ? 'rotate-180' : ''}\`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'carrybee' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={courierConfigs.carrybee?.isSandbox || false}
                            onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isSandbox: e.target.checked } }))}
                          />
                          <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-colors"></div>
                          <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 group-hover/sandbox:text-gray-800 uppercase tracking-widest transition-colors">Sandbox Mode</span>
                      </label>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isActive: !prev.carrybee?.isActive } }))}}
                          className={\`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden \${courierConfigs.carrybee?.isActive ? 'bg-yellow-500' : 'bg-gray-300'}\`}
                        >
                          <div className={\`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${courierConfigs.carrybee?.isActive ? 'left-6' : 'left-1'}\`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.carrybee?.clientId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Secret</label>
                      <input 
                        type="password" 
                        value={courierConfigs.carrybee?.clientSecret || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientSecret: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Secret"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Context</label>
                      <input 
                        type="text" 
                        value={courierConfigs.carrybee?.clientContext || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientContext: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Context"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Paperfly */}
            <div className={\`bg-white rounded-3xl border transition-all duration-300 overflow-hidden \${expandedConfig === 'paperfly' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}\`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'paperfly' ? null : 'paperfly')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-indigo-50">P</div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Paperfly</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Smart logistics for smart businesses</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.paperfly?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center transition-colors \${expandedConfig === 'paperfly' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}\`}>
                    <ChevronDown size={18} className={\`text-gray-500 transition-transform duration-300 \${expandedConfig === 'paperfly' ? 'rotate-180' : ''}\`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'paperfly' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, isActive: !prev.paperfly?.isActive } }))}}
                        className={\`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden \${courierConfigs.paperfly?.isActive ? 'bg-indigo-600' : 'bg-gray-300'}\`}
                      >
                        <div className={\`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${courierConfigs.paperfly?.isActive ? 'left-6' : 'left-1'}\`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                    <input 
                      type="text" 
                      value={courierConfigs.paperfly?.apiKey || ''} 
                      onChange={e => setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, apiKey: e.target.value } }))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm" 
                      placeholder="Enter API Key"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
            
          {/* OTHER CUSTOM COURIERS HEADER */}
          <div className="pt-8 mb-4 border-t border-gray-100 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Manual & Custom Couriers</h3>
                <p className="text-sm text-gray-500 mt-1">Manage couriers that are not directly integrated via API</p>
              </div>
              <button 
                onClick={() => {
                  setEditingCourier(null);
                  setIsAddCourierModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Add Custom Courier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {couriers.filter(c => !['steadfast', 'pathao', 'redx', 'carrybee', 'paperfly'].includes(c.name.toLowerCase())).map((courier) => (
              <div key={courier.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEditCourierModal(courier)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCourier(courier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold shadow-inner">
                    <Truck size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{courier.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={\`w-2 h-2 rounded-full \${courier.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}\`}></div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{courier.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total Orders</p>
                    <p className="text-xl font-bold text-gray-900">{courier.orders || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Success Rate</p>
                    <p className="text-sm font-bold text-green-600 mt-2">{courier.success || '100%'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
\n`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filepath, newContent, 'utf8');
console.log("Replaced block successfully.");
