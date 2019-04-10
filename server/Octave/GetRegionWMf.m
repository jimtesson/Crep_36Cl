function [ ] = GetWMf( name )
% Function that first applies the Chauvenet criterion to a set of data and
% then compute a MSWD-weighted mean out of filtered dataset

% Open paths and load data
addpath Functions
addpath Constants
addpath jsonlab

% Retreive json file
Data=loadjson(name);

% Load values
PRval=Data.PRval;
PRerr=Data.PRerr;

% Calculate
NbSig=2;
[PRval,PRerr]=Chauvenet(PRval,PRerr,NbSig);
[~,Wmean,ErrWm]=CorrWM([PRval PRerr]);

% Export
DataOut.WM=[Wmean ErrWm];

% Write json
DataOut=savejson(name,DataOut);
NameOut=strcat(name(1:end-2),'out');
fileID=fopen(NameOut,'w');
fprintf(fileID,'%s',DataOut);
fclose(fileID);

end

